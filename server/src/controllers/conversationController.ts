import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getUserConversations = async (req: Request, res: Response) => {
  const { userId } = req.params;
//   console.log("getCovo", userId);

  // Validate userId parameter
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      message: 'User ID is required' 
    });
  }

  try {
    // First, verify the user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                imageUrl: true,
                email: true 
              }
            }
          },
          // Filter out the current user from participants for cleaner response
          where: {
            userId: {
              not: userId
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true
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
      orderBy: [
        {
          messages: {
            _count: 'desc'
          }
        },
        {
          createdAt: 'desc'
        }
      ]
    });

    // Transform the response to be more frontend-friendly
    const transformedConversations = conversations.map(conversation => ({
      id: conversation.id,
      isGroup: conversation.isGroup,
      createdAt: conversation.createdAt,
      participants: conversation.participants.map(p => p.user),
      lastMessage: conversation.messages[0] || null,
      messageCount: conversation._count.messages,
      // For non-group chats, provide the other participant's info as 'chatWith'
      chatWith: !conversation.isGroup && conversation.participants.length > 0 
        ? conversation.participants[0].user 
        : null
    }));

    res.json({
      success: true,
      data: transformedConversations,
      count: transformedConversations.length
    });

  } catch (err) {
    console.error('Error fetching user conversations:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
    //   error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET /conversations/:conversationId/messages
export const getConversationMessages = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { userId } = req.query; // Optional: to verify user has access to this conversation

  if (!conversationId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Conversation ID is required' 
    });
  }

  try {
    // Verify conversation exists and user has access to it
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        ...(userId && {
          participants: {
            some: { userId: userId as string }
          }
        })
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conversation not found or access denied' 
      });
    }

    // Get all messages for this conversation
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            email: true
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Order messages chronologically
      }
    });

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          isGroup: conversation.isGroup,
          participants: conversation.participants.map(p => p.user)
        },
        messages: messages
      }
    });

  } catch (err) {
    console.error('Error fetching conversation messages:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error'
    });
  }
};