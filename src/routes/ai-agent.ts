import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';
import { SocketService } from '../services/socket';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();
const prisma = DatabaseService.getInstance();

// Validation schemas for AI agent
const aiAgentSchemas = {
  webhook: Joi.object({
    conversationId: Joi.string().required(),
    message: Joi.string().required().min(1).max(5000),
    userId: Joi.string().optional(),
    metadata: Joi.object().optional()
  }),
  trigger: Joi.object({
    conversationId: Joi.string().required(),
    message: Joi.string().required(),
    userId: Joi.string().required(),
    userMessage: Joi.string().required()
  })
};

// Interface for n8n webhook payload
interface N8nWebhookPayload {
  conversationId: string;
  message: string;
  userId?: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    entities?: any[];
    responseType?: 'text' | 'quick_reply' | 'card';
  };
}

// Interface for triggering n8n workflow
interface N8nTriggerPayload {
  conversationId: string;
  message: string;
  userId: string;
  userMessage: string;
}

// Webhook endpoint for receiving AI responses from n8n
router.post('/webhook', validateRequest(aiAgentSchemas.webhook), async (req: Request, res: Response) => {
  try {
    const { conversationId, message, userId, metadata } = req.body as N8nWebhookPayload;
    
    console.log('AI Agent webhook received:', { conversationId, message, metadata });

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Create AI agent user if doesn't exist
    let aiUser = await prisma.user.findUnique({
      where: { email: 'ai-agent@priyo.local' }
    });

    if (!aiUser) {
      aiUser = await prisma.user.create({
        data: {
          email: 'ai-agent@priyo.local',
          username: 'AI Assistant',
          password: 'ai_agent_system',
          role: 'AGENT'
        }
      });
    }

    // Create AI response message
    const aiMessage = await prisma.message.create({
      data: {
        content: message,
        senderId: aiUser.id,
        conversationId,
        type: 'TEXT',
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      include: { sender: true }
    });

    // Emit to WebSocket for real-time delivery
    const socketService = SocketService.getInstance();
    socketService.emitToConversation(conversationId, 'message:new', {
      id: aiMessage.id,
      content: aiMessage.content,
      sender: aiMessage.sender.username,
      senderRole: aiMessage.sender.role,
      timestamp: aiMessage.createdAt,
      conversationId,
      type: aiMessage.type,
      isAI: true,
      metadata: metadata
    });

    // Also emit to specific participants
    conversation.participants.forEach((participant: any) => {
      socketService.emitToUser(participant.userId, 'message:new', {
        id: aiMessage.id,
        content: aiMessage.content,
        sender: aiMessage.sender.username,
        senderRole: aiMessage.sender.role,
        timestamp: aiMessage.createdAt,
        conversationId,
        type: aiMessage.type,
        isAI: true,
        metadata: metadata
      });
    });

    res.json({
      success: true,
      message: 'AI response delivered successfully',
      messageId: aiMessage.id
    });

  } catch (error) {
    console.error('AI Agent webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI response'
    });
  }
});

// Endpoint to trigger n8n workflow with user message
router.post('/trigger', validateRequest(aiAgentSchemas.trigger), async (req: Request, res: Response) => {
  try {
    const { conversationId, message, userId, userMessage } = req.body as N8nTriggerPayload;
    
    console.log('Triggering n8n workflow:', { conversationId, message, userId });

    // Get conversation context
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 messages for context
          include: { sender: true }
        },
        participants: {
          include: { user: true }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Prepare context for n8n
    const context = {
      conversationId,
      userId,
      userMessage: message,
      conversationHistory: conversation.messages.map((msg: any) => ({
        content: msg.content,
        sender: msg.sender.username,
        role: msg.sender.role,
        timestamp: msg.createdAt,
        isAI: msg.sender.email === 'ai-agent@priyo.local'
      })),
      participants: conversation.participants.map((p: any) => ({
        id: p.user.id,
        username: p.user.username,
        role: p.user.role
      }))
    };

    // Send to n8n webhook (you'll need to configure this URL)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (n8nWebhookUrl) {
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(context)
        });

        if (!response.ok) {
          throw new Error(`n8n webhook failed: ${response.status}`);
        }

        console.log('n8n workflow triggered successfully');
      } catch (fetchError) {
        console.error('Failed to trigger n8n workflow:', fetchError);
        // Continue without failing the request
      }
    } else {
      console.warn('N8N_WEBHOOK_URL not configured');
    }

    res.json({
      success: true,
      message: 'n8n workflow triggered successfully'
    });

  } catch (error) {
    console.error('AI Agent trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger AI agent'
    });
  }
});

// Health check for AI agent integration
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'AI Agent Integration',
    timestamp: new Date().toISOString(),
    n8nConfigured: !!process.env.N8N_WEBHOOK_URL
  });
});

export default router;
