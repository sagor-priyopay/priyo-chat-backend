import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { widgetSchemas } from '../utils/validation';
import { DatabaseService } from '../services/database';
import { SocketService } from '../services/socket';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = DatabaseService.getInstance();

// Widget-specific interfaces
interface WidgetAuthRequest {
  visitorId?: string;
  email?: string;
  name?: string;
}

interface WidgetMessageRequest {
  message: string;
  conversationId?: string;
  visitorId: string;
}

// Generate anonymous visitor token for widget users
router.post('/auth', validateRequest(widgetSchemas.auth), async (req: Request, res: Response) => {
  try {
    console.log('Widget auth request body:', req.body);
    const { visitorId, email, name } = req.body as WidgetAuthRequest;
    
    // Create or find visitor user
    let user = await prisma.user.findUnique({
      where: { email: email || `visitor_${visitorId}@widget.local` }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email || `visitor_${visitorId}@widget.local`,
          username: name || `Visitor_${visitorId}`,
          password: 'widget_user', // Widget users don't need real passwords
          role: 'CUSTOMER'
        }
      });
    }

    // Generate widget-specific JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        isWidget: true,
        visitorId 
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '24h' } // Longer expiry for widget users
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        visitorId
      }
    });
  } catch (error) {
    console.error('Widget auth error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
});

// Start or continue conversation for widget
router.post('/conversation', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const visitorId = (req as any).user.visitorId;

    // Find existing conversation for this visitor or create new one
    let conversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          some: { userId }
        },
        isActive: true
      },
      include: {
        participants: {
          include: { user: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50, // Last 50 messages
          include: { sender: true }
        }
      }
    });

    if (!conversation) {
      // Create new conversation
      let conversation = await prisma.conversation.create({
        data: {
          name: `Widget Chat - ${visitorId}`,
          type: 'DIRECT',
          isActive: true,
          participants: {
            create: [
              { userId }
            ]
          }
        },
        include: {
          participants: {
            include: { user: true }
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { sender: true }
          }
        }
      });

      // Send welcome message
      const welcomeMessage = await prisma.message.create({
        data: {
          content: "Hello! 👋 Welcome to Priyo Pay. How can I help you today?",
          senderId: userId, // System message from user's perspective
          conversationId: conversation.id,
          type: 'TEXT'
        },
        include: { sender: true }
      });

      conversation.messages = [welcomeMessage];
    }

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.name,
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender.username,
          senderRole: msg.sender.role,
          timestamp: msg.createdAt,
          type: msg.type
        }))
      }
    });
  } catch (error) {
    console.error('Widget conversation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get conversation' 
    });
  }
});

// Send message from widget
router.post('/message', authenticateToken, validateRequest(widgetSchemas.message), async (req: Request, res: Response) => {
  try {
    const { message, conversationId } = req.body as WidgetMessageRequest;
    const userId = (req as any).user.userId;

    // Verify user is participant in conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: { userId }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conversation not found' 
      });
    }

    // Create message
    const newMessage = await prisma.message.create({
      data: {
        content: message,
        senderId: userId,
        conversationId,
        type: 'TEXT'
      },
      include: { sender: true }
    });

    // Emit to WebSocket
    SocketService.getInstance().emitToConversation(conversationId, 'message:new', {
      id: newMessage.id,
      content: newMessage.content,
      sender: newMessage.sender.username,
      senderRole: newMessage.sender.role,
      timestamp: newMessage.createdAt,
      conversationId,
      type: newMessage.type
    });

    // Trigger n8n AI agent for automatic response
    try {
      const n8nTriggerUrl = `${req.protocol}://${req.get('host')}/api/ai-agent/trigger`;
      
      await fetch(n8nTriggerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          message,
          userId,
          userMessage: message
        })
      });
      
      console.log('AI agent triggered for message:', message);
    } catch (aiError) {
      console.error('Failed to trigger AI agent:', aiError);
      // Continue without failing the request
    }

    res.json({
      success: true,
      message: {
        id: newMessage.id,
        content: newMessage.content,
        sender: newMessage.sender.username,
        timestamp: newMessage.createdAt,
        type: newMessage.type
      }
    });
  } catch (error) {
    console.error('Widget message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message' 
    });
  }
});

// Get conversation messages for widget
router.get('/conversation/:id/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const userId = (req as any).user.userId;

    // Verify user is participant
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: { userId }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conversation not found' 
      });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: true }
    });

    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender.username,
        senderRole: msg.sender.role,
        timestamp: msg.createdAt,
        type: msg.type
      }))
    });
  } catch (error) {
    console.error('Widget messages error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get messages' 
    });
  }
});

export default router;
