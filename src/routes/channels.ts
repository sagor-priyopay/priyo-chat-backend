import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';
import { SocketService } from '../services/socket';
import crypto from 'crypto';

const router = Router();
const prisma = DatabaseService.getInstance();

// Facebook Messenger Integration
router.get('/facebook/webhook', (req: Request, res: Response) => {
  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'your-verify-token';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Facebook webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

router.post('/facebook/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const webhookEvent of entry.messaging) {
          const senderId = webhookEvent.sender.id;
          const message = webhookEvent.message;

          if (message && message.text) {
            await handleFacebookMessage(senderId, message.text, entry.id);
          }
        }
      }
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Facebook webhook error:', error);
    res.sendStatus(500);
  }
});

// WhatsApp Business API Integration
router.get('/whatsapp/webhook', (req: Request, res: Response) => {
  const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || 'your-whatsapp-verify-token';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post('/whatsapp/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.entry && body.entry[0].changes) {
      for (const change of body.entry[0].changes) {
        if (change.value.messages) {
          for (const message of change.value.messages) {
            const from = message.from;
            const text = message.text?.body;
            const messageId = message.id;

            if (text) {
              await handleWhatsAppMessage(from, text, messageId);
            }
          }
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.sendStatus(500);
  }
});

// Email Integration Endpoint
router.post('/email/webhook', async (req: Request, res: Response) => {
  try {
    const { from, subject, text, html, messageId } = req.body;
    
    if (from && (text || html)) {
      await handleEmailMessage(from, subject || 'Email Support', text || html, messageId);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email webhook error:', error);
    res.sendStatus(500);
  }
});

// Telegram Integration
router.post('/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text;
      const username = message.from.username || message.from.first_name;
      
      await handleTelegramMessage(chatId.toString(), text, username);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// Generic channel message handler
async function handleChannelMessage(
  channelType: string,
  externalUserId: string,
  messageText: string,
  senderName: string,
  metadata?: any
) {
  try {
    // Find or create user for this channel
    const channelUserId = `${channelType}_${externalUserId}`;
    let user = await prisma.user.findUnique({
      where: { email: `${channelUserId}@channel.priyo.com` }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `${channelUserId}@channel.priyo.com`,
          username: `${senderName} (${channelType})`,
          password: crypto.randomBytes(32).toString('hex'), // Random password
          role: 'CUSTOMER',
          isOnline: true,
          verified: true
        }
      });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          some: { userId: user.id }
        },
        type: 'DIRECT'
      },
      include: {
        participants: true
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          name: `${channelType} - ${senderName}`,
          participants: {
            create: [
              { userId: user.id, joinedAt: new Date() }
            ]
          }
        },
        include: {
          participants: true
        }
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: messageText,
        type: 'TEXT',
        conversationId: conversation.id,
        senderId: user.id,
        metadata: metadata ? JSON.stringify(metadata) : null
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

    // Emit to WebSocket for real-time delivery
    const socketService = SocketService.getInstance();
    socketService.emitToConversation(conversation.id, 'new-message', {
      id: message.id,
      text: message.content,
      content: message.content,
      sender: 'user',
      senderId: message.senderId,
      senderUsername: user.username,
      senderRole: 'CUSTOMER',
      timestamp: message.createdAt,
      conversationId: conversation.id,
      type: message.type,
      isAI: false,
      channel: channelType,
      metadata: metadata
    });

    console.log(`${channelType} message processed:`, {
      userId: user.id,
      conversationId: conversation.id,
      messageId: message.id
    });

    return { user, conversation, message };
  } catch (error) {
    console.error(`Error handling ${channelType} message:`, error);
    throw error;
  }
}

// Specific channel handlers
async function handleFacebookMessage(senderId: string, text: string, pageId: string) {
  // Get sender info from Facebook API
  const senderInfo = await getFacebookUserInfo(senderId);
  const senderName = senderInfo?.name || `FB User ${senderId}`;
  
  return handleChannelMessage('facebook', senderId, text, senderName, { pageId });
}

async function handleWhatsAppMessage(from: string, text: string, messageId: string) {
  const senderName = `WA User ${from}`;
  return handleChannelMessage('whatsapp', from, text, senderName, { messageId });
}

async function handleEmailMessage(from: string, subject: string, text: string, messageId?: string) {
  const senderName = from.split('@')[0] || 'Email User';
  const fullMessage = subject ? `Subject: ${subject}\n\n${text}` : text;
  
  return handleChannelMessage('email', from, fullMessage, senderName, { 
    subject, 
    messageId,
    originalFrom: from 
  });
}

async function handleTelegramMessage(chatId: string, text: string, username: string) {
  return handleChannelMessage('telegram', chatId, text, username);
}

// Send message to external channels
router.post('/send/:channel', async (req: Request, res: Response) => {
  try {
    const { channel } = req.params;
    const { conversationId, message, recipientId } = req.body;

    let success = false;
    let error = null;

    switch (channel) {
      case 'facebook':
        success = await sendFacebookMessage(recipientId, message);
        break;
      case 'whatsapp':
        success = await sendWhatsAppMessage(recipientId, message);
        break;
      case 'email':
        success = await sendEmailMessage(recipientId, message);
        break;
      case 'telegram':
        success = await sendTelegramMessage(recipientId, message);
        break;
      default:
        error = 'Unsupported channel';
    }

    if (success) {
      res.json({ success: true, message: 'Message sent successfully' });
    } else {
      res.status(500).json({ success: false, error: error || 'Failed to send message' });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// External API helpers
async function getFacebookUserInfo(userId: string) {
  try {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=first_name,last_name&access_token=${PAGE_ACCESS_TOKEN}`
    );
    const data = await response.json();
    return {
      name: `${data.first_name} ${data.last_name}`.trim()
    };
  } catch (error) {
    console.error('Error getting Facebook user info:', error);
    return null;
  }
}

async function sendFacebookMessage(recipientId: string, message: string): Promise<boolean> {
  try {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
    const response = await fetch('https://graph.facebook.com/v18.0/me/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message }
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Error sending Facebook message:', error);
    return false;
  }
}

async function sendWhatsAppMessage(recipientId: string, message: string): Promise<boolean> {
  try {
    const WA_ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN;
    const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WA_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WA_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientId,
          text: { body: message }
        })
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

async function sendEmailMessage(recipientEmail: string, message: string): Promise<boolean> {
  try {
    // Implement your email service (SendGrid, Mailgun, etc.)
    // This is a placeholder - replace with actual email service
    console.log(`Sending email to ${recipientEmail}: ${message}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

export default router;
