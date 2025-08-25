import { Router, Request, Response } from 'express';
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

interface WidgetConversationRequest {
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

// Start or continue conversation for widget (no auth, use visitorId)
router.post('/conversation', validateRequest(widgetSchemas.conversation), async (req: Request, res: Response) => {
  try {
    const { visitorId } = req.body as WidgetConversationRequest;

    // Derive or create user from visitorId
    const email = `visitor_${visitorId}@widget.local`;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          username: `Visitor_${visitorId}`,
          password: 'widget_user',
          role: 'CUSTOMER'
        }
      });
    }
    const userId = user.id;

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
      conversation = await prisma.conversation.create({
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

      // Send welcome message from system/agent
      // First, find or create an agent user for system messages
      let agentUser = await prisma.user.findFirst({
        where: { role: 'AGENT' }
      });
      
      if (!agentUser) {
        agentUser = await prisma.user.create({
          data: {
            email: 'agent@priyo.com',
            username: 'Priyo Support',
            password: 'system_agent',
            role: 'AGENT'
          }
        });
      }

      const welcomeMessage = await prisma.message.create({
        data: {
          content: "Hello! 👋 Welcome to Priyo Pay. How can I help you today?",
          senderId: agentUser.id, // System message from agent
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
          text: msg.content,  // Widget expects 'text' property
          content: msg.content,
          sender: msg.sender.role === 'AGENT' ? 'bot' : 'user',  // Map to widget format
          senderRole: msg.sender.role,
          senderUsername: msg.sender.username,
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

// Send message from widget (no auth, use visitorId)
router.post('/message', validateRequest(widgetSchemas.message), async (req: Request, res: Response) => {
  try {
    const { message, conversationId, visitorId } = req.body as WidgetMessageRequest;

    // Derive user from visitorId
    const email = `visitor_${visitorId}@widget.local`;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Unknown visitor. Start a conversation first.' });
    }
    const userId = user.id;

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
    SocketService.getInstance().emitToConversation(conversationId, 'new-message', {
      id: newMessage.id,
      text: newMessage.content,  // Widget expects 'text' property
      content: newMessage.content,
      sender: 'user',  // Widget expects 'sender' as 'bot' or 'user'
      senderId: newMessage.senderId,
      senderUsername: user.username,
      senderRole: 'CUSTOMER',
      timestamp: newMessage.createdAt,
      conversationId,
      type: newMessage.type,
      isAI: false
    });

    // Trigger n8n AI agent for automatic response
    try {
      // Show typing indicator for AI while processing
      try {
        SocketService.getInstance().emitToConversation(conversationId, 'typing:start', {
          conversationId,
          userId: 'ai-agent',
          username: 'Priyo AI',
          senderRole: 'AGENT'
        });
      } catch {}

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
router.get('/conversation/:id/messages', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { visitorId } = req.query as any;

    // Derive user from visitorId
    const email = `visitor_${visitorId}@widget.local`;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Unknown visitor. Start a conversation first.' });
    }
    const userId = user.id;

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
