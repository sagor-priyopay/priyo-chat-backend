import { Router, Response } from 'express';
import { AuthenticatedRequest, SendMessageRequest } from '@/types';
import { DatabaseService } from '@/services/database';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { messageValidation } from '@/utils/validation';

const router = Router();
const prisma = DatabaseService.getInstance();

// Get messages for a conversation
router.get('/:conversationId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Verify user is participant
    const participation = await prisma.conversationUser.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null,
      },
    });

    if (!participation) {
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
            avatar: true,
          },
        },
        reads: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      sender: message.sender,
      reads: message.reads.map(read => ({
        user: read.user,
        readAt: read.readAt,
      })),
      createdAt: message.createdAt,
    }));

    res.json({ messages: formattedMessages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message
router.post('/', authenticateToken, validateRequest(messageValidation.send), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId, content, type = 'TEXT' }: SendMessageRequest = req.body;

    // Verify user is participant
    const participation = await prisma.conversationUser.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null,
      },
    });

    if (!participation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        type,
        conversationId,
        senderId: userId,
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
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        id: message.id,
        content: message.content,
        type: message.type,
        sender: message.sender,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark messages as read
router.post('/read', authenticateToken, validateRequest(messageValidation.markAsRead), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { messageIds } = req.body;

    // Verify messages exist and user has access
    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds },
        conversation: {
          participants: {
            some: {
              userId,
              leftAt: null,
            },
          },
        },
      },
    });

    if (messages.length !== messageIds.length) {
      res.status(400).json({ error: 'Some messages not found or access denied' });
      return;
    }

    // Create read records (ignore duplicates)
    const readData = messageIds.map((messageId: string) => ({
      messageId,
      userId,
    }));

    await prisma.messageRead.createMany({
      data: readData
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread message count
router.get('/unread/count', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const unreadCount = await prisma.message.count({
      where: {
        conversation: {
          participants: {
            some: {
              userId,
              leftAt: null,
            },
          },
        },
        senderId: {
          not: userId,
        },
        reads: {
          none: {
            userId,
          },
        },
      },
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
