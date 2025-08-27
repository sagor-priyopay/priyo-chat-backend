import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { DatabaseService } from '../services/database';
import { SocketService } from '../services/socket';
import { authenticateToken } from '../middleware/auth';
import { requireAgentOrAdmin } from '../middleware/roles';

const router = Router();
const prisma = DatabaseService.getInstance();

// Get all conversations for agent dashboard
router.get('/conversations', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, status, assigned, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      isActive: true,
    };

    // Filter by conversation type
    if (type === 'chat') {
      whereClause.type = 'DIRECT';
    } else if (type === 'ticket') {
      whereClause.type = 'GROUP';
    }

    // Filter by assignment
    if (assigned === 'mine') {
      whereClause.assignedTo = req.user!.id;
    } else if (assigned === 'unassigned') {
      whereClause.assignedTo = null;
    }

    // Filter by status
    if (status && status !== 'all') {
      whereClause.status = status.toUpperCase();
    }

    // Search functionality
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { 
          participants: {
            some: {
              user: {
                OR: [
                  { username: { contains: search as string, mode: 'insensitive' } },
                  { email: { contains: search as string, mode: 'insensitive' } }
                ]
              }
            }
          }
        }
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
        assignedAgent: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                reads: {
                  none: {
                    user: {
                      role: { in: ['AGENT', 'ADMIN'] }
                    }
                  },
                },
                sender: {
                  role: 'CUSTOMER'
                },
              },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ],
      skip: offset,
      take: limit,
    });

    const formattedConversations = conversations.map(conv => {
      const customer = conv.participants.find(p => p.user.role === 'CUSTOMER')?.user;
      const isTicket = conv.type === 'GROUP';
      
      return {
        id: conv.id,
        type: isTicket ? 'ticket' : 'chat',
        subject: conv.name,
        customer: customer ? {
          id: customer.id,
          name: customer.username,
          email: customer.email,
          avatar: customer.avatar,
          isOnline: customer.isOnline,
          lastSeen: customer.lastSeen,
        } : null,
        lastMessage: conv.messages[0] ? {
          id: conv.messages[0].id,
          text: conv.messages[0].content,
          timestamp: conv.messages[0].createdAt,
          sender: conv.messages[0].sender.role === 'CUSTOMER' ? 'customer' : 'agent',
        } : null,
        status: conv.status || 'open',
        priority: conv.priority || 'medium',
        assignedTo: conv.assignedTo,
        assignedAgent: conv.assignedAgent,
        unread: conv._count.messages > 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.conversation.count({ where: whereClause });

    res.json({
      conversations: formattedConversations,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Get agent conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversation messages for agent
router.get('/conversations/:conversationId/messages', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Verify conversation exists
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isActive: true,
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        reads: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take: limit,
    });

    const formattedMessages = messages.map(message => ({
      id: message.id,
      text: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      sender: message.sender.role === 'CUSTOMER' ? 'customer' : 'agent',
      senderInfo: {
        id: message.sender.id,
        name: message.sender.username,
        email: message.sender.email,
        avatar: message.sender.avatar,
        role: message.sender.role,
      },
      reads: message.reads.map(read => ({
        user: read.user,
        readAt: read.readAt,
      })),
      timestamp: message.createdAt,
      createdAt: message.createdAt,
    }));

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message as agent
router.post('/conversations/:conversationId/messages', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const agentId = req.user!.id;
    const { conversationId } = req.params;
    const { text, type = 'TEXT' } = req.body;

    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    // Verify conversation exists
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        isActive: true,
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, role: true }
            }
          }
        }
      }
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: text.trim(),
        type,
        conversationId,
        senderId: agentId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Update conversation timestamp and assign to agent if not assigned
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { 
        updatedAt: new Date(),
        assignedTo: conversation.assignedTo || agentId,
        status: 'OPEN'
      },
    });

    // Emit real-time message to all participants
    const socketService = SocketService.getInstance();
    const messageData = {
      id: message.id,
      text: message.content,
      type: message.type,
      sender: 'agent',
      senderInfo: {
        id: message.sender.id,
        name: message.sender.username,
        email: message.sender.email,
        avatar: message.sender.avatar,
        role: message.sender.role,
      },
      conversationId,
      timestamp: message.createdAt,
    };

    // Emit to all participants
    conversation.participants.forEach(participant => {
      socketService.emitToUser(participant.userId, 'new-message', messageData);
    });

    // Emit to all agents for dashboard updates
    socketService.emitToRole('AGENT', 'conversation-updated', {
      conversationId,
      lastMessage: messageData,
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: messageData,
    });
  } catch (error) {
    console.error('Send agent message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign conversation to agent
router.post('/conversations/:conversationId/assign', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { agentId } = req.body;
    const currentAgentId = req.user!.id;

    // Use current agent if no agentId provided
    const targetAgentId = agentId || currentAgentId;

    // Verify agent exists and has proper role
    const agent = await prisma.user.findFirst({
      where: {
        id: targetAgentId,
        role: { in: ['AGENT', 'ADMIN'] },
      },
    });

    if (!agent) {
      res.status(400).json({ error: 'Invalid agent ID' });
      return;
    }

    // Update conversation
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        assignedTo: targetAgentId,
        status: 'OPEN',
        updatedAt: new Date(),
      },
      include: {
        assignedAgent: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Emit real-time update
    const socketService = SocketService.getInstance();
    socketService.emitToRole('AGENT', 'conversation-assigned', {
      conversationId,
      assignedTo: targetAgentId,
      assignedAgent: conversation.assignedAgent,
    });

    res.json({
      message: 'Conversation assigned successfully',
      assignedTo: targetAgentId,
      assignedAgent: conversation.assignedAgent,
    });
  } catch (error) {
    console.error('Assign conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolve conversation
router.post('/conversations/:conversationId/resolve', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const agentId = req.user!.id;

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'RESOLVED',
        assignedTo: agentId,
        updatedAt: new Date(),
      },
    });

    // Emit real-time update
    const socketService = SocketService.getInstance();
    socketService.emitToRole('AGENT', 'conversation-resolved', {
      conversationId,
      status: 'RESOLVED',
      resolvedBy: agentId,
    });

    res.json({
      message: 'Conversation resolved successfully',
      status: 'RESOLVED',
    });
  } catch (error) {
    console.error('Resolve conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reopen conversation
router.post('/conversations/:conversationId/reopen', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const agentId = req.user!.id;

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'OPEN',
        assignedTo: agentId,
        updatedAt: new Date(),
      },
    });

    // Emit real-time update
    const socketService = SocketService.getInstance();
    socketService.emitToRole('AGENT', 'conversation-reopened', {
      conversationId,
      status: 'OPEN',
      reopenedBy: agentId,
    });

    res.json({
      message: 'Conversation reopened successfully',
      status: 'OPEN',
    });
  } catch (error) {
    console.error('Reopen conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update agent status
router.post('/status', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const agentId = req.user!.id;
    const { status } = req.body;

    if (!['online', 'away', 'offline'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be: online, away, offline' });
      return;
    }

    // Update user status
    const user = await prisma.user.update({
      where: { id: agentId },
      data: {
        isOnline: status === 'online',
        lastSeen: new Date(),
      },
    });

    // Emit real-time status update
    const socketService = SocketService.getInstance();
    socketService.emitToRole('AGENT', 'agent-status-updated', {
      agentId,
      status,
      lastSeen: user.lastSeen,
    });

    res.json({
      message: 'Status updated successfully',
      status,
      lastSeen: user.lastSeen,
    });
  } catch (error) {
    console.error('Update agent status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agent dashboard stats
router.get('/stats', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const agentId = req.user!.id;

    // Get various counts
    const [
      totalConversations,
      myConversations,
      unassignedConversations,
      resolvedToday,
      unreadMessages
    ] = await Promise.all([
      prisma.conversation.count({
        where: { isActive: true }
      }),
      prisma.conversation.count({
        where: { assignedTo: agentId, isActive: true }
      }),
      prisma.conversation.count({
        where: { assignedTo: null, isActive: true }
      }),
      prisma.conversation.count({
        where: {
          status: 'RESOLVED',
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.message.count({
        where: {
          conversation: { isActive: true },
          sender: { role: 'CUSTOMER' },
          reads: {
            none: {
              user: { role: { in: ['AGENT', 'ADMIN'] } }
            }
          }
        }
      })
    ]);

    res.json({
      totalConversations,
      myConversations,
      unassignedConversations,
      resolvedToday,
      unreadMessages,
    });
  } catch (error) {
    console.error('Get agent stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
