import { Router, Response } from 'express';
import { AuthenticatedRequest, CreateConversationRequest } from '../types';
import { DatabaseService } from '../services/database';
import { authenticateToken } from '../middleware/auth';
import { requireAgentOrAdmin } from '../middleware/roles';
import { validateRequest } from '../middleware/validation';
import { conversationValidation } from '../utils/validation';

const router = Router();
const prisma = DatabaseService.getInstance();

// Get user's conversations
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            leftAt: null,
          },
        },
        isActive: true,
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
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
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                reads: {
                  none: {
                    userId,
                  },
                },
                senderId: {
                  not: userId,
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      name: conv.name,
      type: conv.type,
      participants: conv.participants.map(p => p.user),
      lastMessage: conv.messages[0] || null,
      unreadCount: conv._count.messages,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));

    res.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new conversation
router.post('/', authenticateToken, validateRequest(conversationValidation.create), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { participantIds, name, type }: CreateConversationRequest = req.body;

    // Add current user to participants if not already included
    const allParticipantIds = Array.from(new Set([userId, ...participantIds]));

    // For direct conversations, ensure only 2 participants
    if (type === 'DIRECT' && allParticipantIds.length !== 2) {
      res.status(400).json({ error: 'Direct conversations must have exactly 2 participants' });
      return;
    }

    // Check if direct conversation already exists
    if (type === 'DIRECT') {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: {
              userId: { in: allParticipantIds },
              leftAt: null,
            },
          },
        },
        include: {
          participants: {
            where: { leftAt: null },
          },
        },
      });

      if (existingConversation && existingConversation.participants.length === 2) {
        res.status(409).json({ 
          error: 'Direct conversation already exists',
          conversationId: existingConversation.id,
        });
        return;
      }
    }

    // Verify all participants exist
    const users = await prisma.user.findMany({
      where: { id: { in: allParticipantIds } },
    });

    if (users.length !== allParticipantIds.length) {
      res.status(400).json({ error: 'One or more participants not found' });
      return;
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        name: type === 'GROUP' ? name : null,
        type,
        participants: {
          create: allParticipantIds.map(participantId => ({
            userId: participantId,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: {
        id: conversation.id,
        name: conversation.name,
        type: conversation.type,
        participants: conversation.participants.map(p => p.user),
        createdAt: conversation.createdAt,
      },
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversation details
router.get('/:conversationId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId,
            leftAt: null,
          },
        },
        isActive: true,
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.json({
      conversation: {
        id: conversation.id,
        name: conversation.name,
        type: conversation.type,
        participants: conversation.participants.map(p => p.user),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave/Close conversation (only agents can close conversations)
router.delete('/:conversationId', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    // Check if user is participant
    const participation = await prisma.conversationUser.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null,
      },
    });

    if (!participation) {
      res.status(404).json({ error: 'Conversation not found or already left' });
      return;
    }

    // Mark user as left
    await prisma.conversationUser.update({
      where: { id: participation.id },
      data: { leftAt: new Date() },
    });

    // Check if this was the last participant
    const remainingParticipants = await prisma.conversationUser.count({
      where: {
        conversationId,
        leftAt: null,
      },
    });

    // If no participants left, mark conversation as inactive
    if (remainingParticipants === 0) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { isActive: false },
      });
    }

    res.json({ message: 'Left conversation successfully' });
  } catch (error) {
    console.error('Leave conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
