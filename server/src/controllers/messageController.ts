import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// POST /messages/send - Send a new message
// export const sendMessage = async (req: Request, res: Response) => {
//  try {
//     const { conversationId, senderId, content, imageUrl } = req.body;

//     // Validate required fields
//     if (!conversationId || !senderId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Conversation ID and Sender ID are required'
//       });
//     }

//     if (!content && !imageUrl) {
//       return res.status(400).json({
//         success: false,
//         message: 'Message must have either content or an image'
//       });
//     }

//     // Verify the conversation exists and user is a participant
//     const conversation = await prisma.conversation.findFirst({
//       where: {
//         id: conversationId,
//         participants: {
//           some: {
//             userId: senderId
//           }
//         }
//       },
//       include: {
//         participants: {
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 name: true,
//                 email: true,
//                 imageUrl: true
//               }
//             }
//           }
//         }
//       }
//     });

//     if (!conversation) {
//       return res.status(404).json({
//         success: false,
//         message: 'Conversation not found or user not authorized'
//       });
//     }

//     // Create the message
//     const message = await prisma.message.create({
//       data: {
//         content: content || null,
//         imageUrl: imageUrl || null,
//         senderId,
//         conversationId
//       },
//       include: {
//         sender: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             imageUrl: true
//           }
//         },
//         reactions: {
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 name: true
//               }
//             }
//           }
//         }
//       }
//     });

//     // Get Socket.IO instance from app
//     const io = req.app.get('io');
    
//     // Emit the message to all participants in the conversation
//     io.to(`conversation_${conversationId}`).emit('new_message', message);

//     // Also emit to individual user rooms for notifications
//     conversation.participants.forEach(participant => {
//       if (participant.userId !== senderId) {
//         io.to(`user_${participant.userId}`).emit('message_notification', {
//           message,
//           conversationId,
//           from: message.sender
//         });
//       }
//     });

//     res.status(201).json({
//       success: true,
//       data: message
//     });

//   } catch (error) {
//     console.error('Error sending message:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to send message'
//     });
//   }
// };


// POST /messages/conversations - Create a new conversation
export const getConversation = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { userId, page = '1', limit = '50' } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Verify user is a participant in the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: userId as string
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or user not authorized'
      });
    }

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: {
        conversationId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
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
        createdAt: 'asc'
      },
      skip,
      take: limitNumber
    });

    // Get total count for pagination
    const totalMessages = await prisma.message.count({
      where: {
        conversationId
      }
    });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalMessages,
          totalPages: Math.ceil(totalMessages / limitNumber)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
};

// export const deleteMessage = async (req: Request, res: Response) => {
//     try {
//     const { messageId } = req.params;
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: 'User ID is required'
//       });
//     }

//     // Find the message and verify ownership
//     const message = await prisma.message.findFirst({
//       where: {
//         id: messageId,
//         senderId: userId
//       }
//     });

//     if (!message) {
//       return res.status(404).json({
//         success: false,
//         message: 'Message not found or not authorized to delete'
//       });
//     }

//     // Delete the message (this will cascade to reactions due to foreign key)
//     await prisma.message.delete({
//       where: {
//         id: messageId
//       }
//     });

//     // Get Socket.IO instance and notify participants
//     const io = req.app.get('io');
//     io.to(`conversation_${message.conversationId}`).emit('message_deleted', {
//       messageId,
//       conversationId: message.conversationId
//     });

//     res.json({
//       success: true,
//       message: 'Message deleted successfully'
//     });

//   } catch (error) {
//     console.error('Error deleting message:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete message'
//     });
//   }
// }

// export const addReaction = async (req: Request, res: Response) => {
//     try {
//     const { messageId } = req.params;
//     const { userId, emoji } = req.body;

//     if (!userId || !emoji) {
//       return res.status(400).json({
//         success: false,
//         message: 'User ID and emoji are required'
//       });
//     }

//     // Verify message exists
//     const message = await prisma.message.findUnique({
//       where: { id: messageId }
//     });

//     if (!message) {
//       return res.status(404).json({
//         success: false,
//         message: 'Message not found'
//       });
//     }

//     // Check if reaction already exists
//     const existingReaction = await prisma.messageReaction.findUnique({
//       where: {
//         messageId_userId_emoji: {
//           messageId,
//           userId,
//           emoji
//         }
//       }
//     });

//     if (existingReaction) {
//       // Remove reaction if it exists
//       await prisma.messageReaction.delete({
//         where: {
//           id: existingReaction.id
//         }
//       });

//       // Get Socket.IO instance and notify
//       const io = req.app.get('io');
//       io.to(`conversation_${message.conversationId}`).emit('reaction_removed', {
//         messageId,
//         userId,
//         emoji,
//         conversationId: message.conversationId
//       });

//       return res.json({
//         success: true,
//         message: 'Reaction removed'
//       });
//     }

//     // Add new reaction
//     const reaction = await prisma.messageReaction.create({
//       data: {
//         messageId,
//         userId,
//         emoji
//       },
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true
//           }
//         }
//       }
//     });

//     // Get Socket.IO instance and notify
//     const io = req.app.get('io');
//     io.to(`conversation_${message.conversationId}`).emit('reaction_added', {
//       reaction,
//       messageId,
//       conversationId: message.conversationId
//     });

//     res.status(201).json({
//       success: true,
//       data: reaction
//     });

//   } catch (error) {
//     console.error('Error managing reaction:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to manage reaction'
//     });
//   }
// }