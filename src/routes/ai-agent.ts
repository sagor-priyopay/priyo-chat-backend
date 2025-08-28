import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';
import { SocketService } from '../services/socket';

const router = Router();
const prisma = DatabaseService.getInstance();

// n8n webhook trigger endpoint
router.post('/trigger', async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId, message, userId } = req.body;

    if (!conversationId || !message) {
      res.status(400).json({ error: 'Missing required fields: conversationId, message' });
      return;
    }

    // Find the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true }
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Create system user for AI responses if it doesn't exist
    let systemUser = await prisma.user.findUnique({
      where: { email: 'ai@priyo.com' }
    });

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          email: 'ai@priyo.com',
          username: 'Priyo AI',
          password: 'system-user',
          role: 'USER'
        }
      });
    }

    // Create AI response message
    const aiMessage = await prisma.message.create({
      data: {
        content: message,
        conversationId,
        senderId: systemUser.id,
        type: 'text'
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    });

    // Stop typing indicator for AI
    try {
      SocketService.getInstance().emitToConversation(conversationId, 'typing:stop', {
        conversationId,
        userId: systemUser.id,
        username: 'Priyo AI',
        senderRole: 'USER'
      });
    } catch {}

    // Emit the AI message to all participants
    SocketService.getInstance().emitToConversation(conversationId, 'message:new', {
      id: aiMessage.id,
      content: aiMessage.content,
      senderId: aiMessage.senderId,
      senderUsername: aiMessage.sender.username,
      senderRole: aiMessage.sender.role,
      timestamp: aiMessage.createdAt,
      conversationId,
      type: aiMessage.type,
      isAI: true
    });

    res.json({ 
      success: true, 
      messageId: aiMessage.id,
      message: 'AI response sent successfully'
    });

  } catch (error) {
    console.error('AI agent trigger error:', error);
    res.status(500).json({ error: 'Failed to process AI response' });
  }
});

// n8n webhook for receiving responses
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId, response, metadata } = req.body;

    if (!conversationId || !response) {
      res.status(400).json({ error: 'Missing required fields: conversationId, response' });
      return;
    }

    // Forward to trigger endpoint
    const triggerResponse = await fetch(`${req.protocol}://${req.get('host')}/api/ai-agent/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        message: response,
        metadata
      })
    });

    if (triggerResponse.ok) {
      res.json({ success: true, message: 'Webhook processed successfully' });
    } else {
      res.status(500).json({ error: 'Failed to process webhook' });
    }

  } catch (error) {
    console.error('AI webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
