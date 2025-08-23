import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/database';
import { authenticateToken } from '../middleware/auth';
import { requireAgentOrAdmin } from '../middleware/roles';
import { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = DatabaseService.getInstance();

// Get all conversations for agent dashboard
router.get('/conversations', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role;
    
    // Admin sees all conversations, agents only see their assigned ones
    const whereClause = userRole === 'ADMIN' ? {} : {
      participants: {
        some: {
          userId: req.user!.id,
          leftAt: null
        }
      }
    };

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
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
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        // Admin sees total unread messages, agents see their personal unread count
        const unreadCount = userRole === 'ADMIN' 
          ? await prisma.message.count({
              where: {
                conversationId: conversation.id,
                reads: {
                  none: {}
                }
              }
            })
          : await prisma.message.count({
              where: {
                conversationId: conversation.id,
                senderId: {
                  not: req.user!.id
                },
                reads: {
                  none: {
                    userId: req.user!.id
                  }
                }
              }
            });

        return {
          ...conversation,
          unreadCount,
          messageCount: conversation._count.messages
        };
      })
    );

    res.json({
      success: true,
      conversations: conversationsWithUnread
    });
  } catch (error) {
    console.error('Error fetching conversations for agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations'
    });
  }
});

// Get conversation details with full message history
router.get('/conversations/:conversationId', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true
              }
            }
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true
              }
            },
            reads: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
      return;
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Error fetching conversation details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation details'
    });
  }
});

// Update agent status
router.put('/status', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const validStatuses = ['online', 'busy', 'offline'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: online, busy, offline'
      });
      return;
    }

    // Update user status
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        isOnline: status === 'online',
        lastSeen: new Date()
      }
    });

    // You can also store agent-specific status in a separate table if needed
    // For now, we'll use the isOnline field

    res.json({
      success: true,
      message: 'Status updated successfully',
      status
    });
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
});

// Get agent statistics
router.get('/stats', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const agentId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get various statistics
    const [
      totalConversations,
      todayConversations,
      totalMessages,
      todayMessages,
      activeConversations
    ] = await Promise.all([
      // Total conversations where agent participated
      prisma.conversation.count({
        where: {
          participants: {
            some: {
              userId: agentId
            }
          }
        }
      }),

      // Today's conversations
      prisma.conversation.count({
        where: {
          participants: {
            some: {
              userId: agentId
            }
          },
          createdAt: {
            gte: today
          }
        }
      }),

      // Total messages sent by agent
      prisma.message.count({
        where: {
          senderId: agentId
        }
      }),

      // Today's messages sent by agent
      prisma.message.count({
        where: {
          senderId: agentId,
          createdAt: {
            gte: today
          }
        }
      }),

      // Currently active conversations (no leftAt timestamp)
      prisma.conversation.count({
        where: {
          participants: {
            some: {
              userId: agentId,
              leftAt: null
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalConversations,
        todayConversations,
        totalMessages,
        todayMessages,
        activeConversations
      }
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Assign conversation to agent (for admin use)
router.post('/conversations/:conversationId/assign', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { agentId } = req.body;

    // Verify the conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
      return;
    }

    // Verify the agent exists and has proper role
    const agent = await prisma.user.findUnique({
      where: { id: agentId }
    });

    if (!agent || (agent.role !== 'AGENT' && agent.role !== 'ADMIN')) {
      res.status(400).json({
        success: false,
        message: 'Invalid agent ID or user is not an agent'
      });
      return;
    }

    // Check if agent is already a participant
    const existingParticipation = await prisma.conversationUser.findFirst({
      where: {
        conversationId,
        userId: agentId
      }
    });

    if (existingParticipation) {
      res.status(400).json({
        success: false,
        message: 'Agent is already assigned to this conversation'
      });
      return;
    }

    // Add agent as participant
    await prisma.conversationUser.create({
      data: {
        conversationId,
        userId: agentId,
        joinedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Agent assigned to conversation successfully'
    });
  } catch (error) {
    console.error('Error assigning agent to conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign agent'
    });
  }
});

// Mark messages as read
router.post('/conversations/:conversationId/read', authenticateToken, requireAgentOrAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const agentId = req.user!.id;

    // Get all unread messages in the conversation
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: {
          not: agentId
        },
        reads: {
          none: {
            userId: agentId
          }
        }
      }
    });

    // Mark all as read
    const readPromises = unreadMessages.map(message =>
      prisma.messageRead.create({
        data: {
          messageId: message.id,
          userId: agentId,
          readAt: new Date()
        }
      })
    );

    await Promise.all(readPromises);

    res.json({
      success: true,
      message: 'Messages marked as read',
      markedCount: unreadMessages.length
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read'
    });
  }
});

// Get all agents (admin only)
router.get('/agents', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
      return;
    }

    const agents = await prisma.user.findMany({
      where: {
        role: {
          in: ['AGENT', 'ADMIN']
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        verified: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      agents
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents'
    });
  }
});

// Create new agent (admin only)
router.post('/agents', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
      return;
    }

    const { email, username, password, role = 'AGENT' } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({
        success: false,
        message: 'Email, username, and password are required'
      });
      return;
    }

    if (!['AGENT', 'ADMIN'].includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Role must be either AGENT or ADMIN'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const newAgent = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role,
        isOnline: false,
        verified: true
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent: newAgent
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent'
    });
  }
});

// Update agent (admin only)
router.put('/agents/:agentId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
      return;
    }

    const { agentId } = req.params;
    const { username, email, role, isOnline } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role && ['AGENT', 'ADMIN', 'CUSTOMER'].includes(role)) updateData.role = role;
    if (typeof isOnline === 'boolean') updateData.isOnline = isOnline;

    const updatedAgent = await prisma.user.update({
      where: { id: agentId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isOnline: true,
        lastSeen: true
      }
    });

    res.json({
      success: true,
      message: 'Agent updated successfully',
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent'
    });
  }
});

// Delete agent (admin only)
router.delete('/agents/:agentId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
      return;
    }

    const { agentId } = req.params;

    // Prevent admin from deleting themselves
    if (agentId === req.user!.id) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
      return;
    }

    await prisma.user.delete({
      where: { id: agentId }
    });

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent'
    });
  }
});

export default router;
