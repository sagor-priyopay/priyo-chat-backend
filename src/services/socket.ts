import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './database';
import { JWTPayload, SocketUser, TypingData, MessageData, MessageDeliveredData, MessageReadData } from '../types';

export class SocketService {
  private io: SocketIOServer;
  private prisma = DatabaseService.getInstance();
  private connectedUsers = new Map<string, SocketUser>();
  private userSockets = new Map<string, string>(); // userId -> socketId
  private static instance: SocketService;

  constructor(server: HttpServer) {
    if (SocketService.instance) {
      return SocketService.instance;
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          process.env.CORS_ORIGIN || "http://localhost:3000",
          "http://localhost:3002"  // Added frontend origin
        ],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    SocketService.instance = this;
  }

  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const visitorId = socket.handshake.auth.visitorId;
        
        // Allow widget connections without authentication
        if (!token && visitorId) {
          socket.data.user = {
            id: visitorId,
            email: `visitor_${visitorId}@widget.local`,
            username: `Visitor_${visitorId.slice(-6)}`,
            role: 'CUSTOMER',
            socketId: socket.id,
            isWidget: true,
          };
          return next();
        }
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
        
        // Verify user exists and is active
        const user = await this.prisma.user.findUnique({
          where: { id: payload.userId },
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.data.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          socketId: socket.id,
        };

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
      this.handleDisconnection(socket);
      this.handleJoinConversation(socket);
      this.handleLeaveConversation(socket);
      this.handleSendMessage(socket);
      this.handleTypingStart(socket);
      this.handleTypingStop(socket);
      this.handleMessageRead(socket);
    });
  }

  private handleConnection(socket: Socket): void {
    const user: SocketUser = socket.data.user;
    
    this.connectedUsers.set(socket.id, user);
    this.userSockets.set(user.id, socket.id);

    // Update user online status (skip for widget users)
    if (!user.isWidget) {
      this.prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: new Date() },
      }).catch(console.error);
    }

    console.log(`User ${user.username} connected with socket ${socket.id}`);

    // Notify user's contacts about online status
    this.broadcastUserStatus(user.id, true);
  }

  private handleDisconnection(socket: Socket): void {
    socket.on('disconnect', async () => {
      const user = this.connectedUsers.get(socket.id);
      if (!user) return;

      this.connectedUsers.delete(socket.id);
      this.userSockets.delete(user.id);

      // Update user offline status (skip for widget users)
      try {
        if (!user.isWidget) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { isOnline: false, lastSeen: new Date() },
          });

          // Clean up typing indicators
          await this.prisma.typingIndicator.deleteMany({
            where: { userId: user.id },
          });
        }

        console.log(`User ${user.username} disconnected`);
        
        // Notify user's contacts about offline status
        this.broadcastUserStatus(user.id, false);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  }

  private handleJoinConversation(socket: Socket): void {
    socket.on('conversation:join', async (conversationId: string) => {
      try {
        const user: SocketUser = socket.data.user;

        // Allow widget users to join any conversation
        if (user.isWidget) {
          socket.join(conversationId);
          console.log(`Widget user ${user.username} joined conversation ${conversationId}`);
          return;
        }

        // Verify authenticated user is participant
        const participation = await this.prisma.conversationUser.findFirst({
          where: {
            conversationId,
            userId: user.id,
            leftAt: null,
          },
        });

        if (!participation) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }

        socket.join(conversationId);
        console.log(`User ${user.username} joined conversation ${conversationId}`);
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });
  }

  private handleLeaveConversation(socket: Socket): void {
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(conversationId);
      const user: SocketUser = socket.data.user;
      console.log(`User ${user.username} left conversation ${conversationId}`);
    });
  }

  private handleSendMessage(socket: Socket): void {
    socket.on('message:send', async (data: { conversationId: string; content: string; type?: 'TEXT' | 'FILE' | 'IMAGE' }) => {
      try {
        const user: SocketUser = socket.data.user;
        const { conversationId, content, type = 'TEXT' } = data;

        // Verify user is participant
        const participation = await this.prisma.conversationUser.findFirst({
          where: {
            conversationId,
            userId: user.id,
            leftAt: null,
          },
        });

        if (!participation) {
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }

        // Create message
        const message = await this.prisma.message.create({
          data: {
            content,
            type,
            conversationId,
            senderId: user.id,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        });

        // Update conversation timestamp
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        const messageData: MessageData = {
          id: message.id,
          content: message.content,
          type: message.type as 'TEXT' | 'FILE' | 'IMAGE',
          fileUrl: message.fileUrl || undefined,
          fileName: message.fileName || undefined,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderUsername: message.sender.username,
          createdAt: message.createdAt,
        };

        // Broadcast to conversation participants
        this.io.to(conversationId).emit('message:new', messageData);

        // Get conversation participants for delivery confirmation
        const participants = await this.prisma.conversationUser.findMany({
          where: {
            conversationId,
            leftAt: null,
            userId: { not: user.id },
          },
          select: { userId: true },
        });

        const deliveredTo = participants
          .filter(p => this.userSockets.has(p.userId))
          .map(p => p.userId);

        if (deliveredTo.length > 0) {
          const deliveryData: MessageDeliveredData = {
            messageId: message.id,
            conversationId,
            deliveredTo,
          };
          socket.emit('message:delivered', deliveryData);
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
  }

  private handleTypingStart(socket: Socket): void {
    socket.on('typing:start', async (data: { conversationId: string }) => {
      try {
        const user: SocketUser = socket.data.user;
        const { conversationId } = data;

        // Create or update typing indicator
        await this.prisma.typingIndicator.upsert({
          where: {
            conversationId_userId: {
              conversationId,
              userId: user.id,
            },
          },
          create: {
            conversationId,
            userId: user.id,
          },
          update: {
            startedAt: new Date(),
          },
        });

        const typingData: TypingData = {
          conversationId,
          userId: user.id,
          username: user.username,
        };

        // Broadcast to other participants in the conversation
        socket.to(conversationId).emit('typing:start', typingData);
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });
  }

  private handleTypingStop(socket: Socket): void {
    socket.on('typing:stop', async (data: { conversationId: string }) => {
      try {
        const user: SocketUser = socket.data.user;
        const { conversationId } = data;

        // Remove typing indicator
        await this.prisma.typingIndicator.deleteMany({
          where: {
            conversationId,
            userId: user.id,
          },
        });

        const typingData: TypingData = {
          conversationId,
          userId: user.id,
          username: user.username,
        };

        // Broadcast to other participants in the conversation
        socket.to(conversationId).emit('typing:stop', typingData);
      } catch (error) {
        console.error('Error handling typing stop:', error);
      }
    });
  }

  private handleMessageRead(socket: Socket): void {
    socket.on('message:read', async (data: { messageId: string; conversationId: string }) => {
      try {
        const user: SocketUser = socket.data.user;
        const { messageId, conversationId } = data;

        // Create read record
        await this.prisma.messageRead.create({
          data: {
            messageId,
            userId: user.id,
          },
        });

        const readData: MessageReadData = {
          messageId,
          conversationId,
          readBy: user.id,
          readAt: new Date(),
        };

        // Broadcast to conversation participants
        socket.to(conversationId).emit('message:read', readData);
      } catch (error) {
        console.error('Error handling message read:', error);
      }
    });
  }

  private async broadcastUserStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      // Get user's conversations to notify participants
      const conversations = await this.prisma.conversationUser.findMany({
        where: {
          userId,
          leftAt: null,
        },
        select: {
          conversationId: true,
        },
      });

      const statusData = {
        userId,
        isOnline,
        lastSeen: new Date(),
      };

      // Broadcast to all conversations the user is part of
      conversations.forEach(conv => {
        this.io.to(conv.conversationId).emit('user:status', statusData);
      });
    } catch (error) {
      console.error('Error broadcasting user status:', error);
    }
  }

  // Clean up old typing indicators (call this periodically)
  public async cleanupTypingIndicators(): Promise<void> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await this.prisma.typingIndicator.deleteMany({
        where: {
          startedAt: {
            lt: fiveMinutesAgo,
          },
        },
      });
    } catch (error) {
      console.error('Error cleaning up typing indicators:', error);
    }
  }

  // Widget-specific methods for integration
  public emitToConversation(conversationId: string, event: string, data: any): void {
    this.io.to(conversationId).emit(event, data);
  }

  public emitToUser(userId: string, event: string, data: any): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      throw new Error('SocketService not initialized. Call constructor first.');
    }
    return SocketService.instance;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
