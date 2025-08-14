import { Server, Socket } from 'socket.io';
import prisma from '../../lib/prisma';

export const handleMessages = (socket: Socket, io: Server) => {
  const socketData = socket as any;

  // Handle sending messages via WebSocket
  socket.on('send_message', async (data: {
    conversationId: string;
    content?: string;
    imageUrl?: string;
  }) => {
    try {
      const { conversationId, content, imageUrl } = data;
      const senderId = socketData.userId;

      // Validate required fields
      if (!conversationId) {
        socket.emit('message_error', { message: 'Conversation ID is required' });
        return;
      }

      if (!content && !imageUrl) {
        socket.emit('message_error', { message: 'Message must have either content or an image' });
        return;
      }

      // Verify the conversation exists and user is a participant
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: {
            some: {
              userId: senderId
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  imageUrl: true
                }
              }
            }
          }
        }
      });

      if (!conversation) {
        socket.emit('message_error', { message: 'Conversation not found or user not authorized' });
        return;
      }

      // Create the message
      const message = await prisma.message.create({
        data: {
          content: content || null,
          imageUrl: imageUrl || null,
          senderId,
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
        }
      });

      // Emit the message to all participants in the conversation
      io.to(`conversation_${conversationId}`).emit('new_message', message);

      // Also emit to individual user rooms for notifications
      conversation.participants.forEach(participant => {
        if (participant.userId !== senderId) {
          io.to(`user_${participant.userId}`).emit('message_notification', {
            message,
            conversationId,
            from: message.sender
          });
        }
      });

      // Confirm to sender
      socket.emit('message_sent', { messageId: message.id });

    } catch (error) {
      console.error('Error sending message via WebSocket:', error);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });

  // Handle message reactions via WebSocket
  socket.on('toggle_reaction', async (data: {
    messageId: string;
    emoji: string;
  }) => {
    try {
      const { messageId, emoji } = data;
      const userId = socketData.userId;

      if (!messageId || !emoji) {
        socket.emit('reaction_error', { message: 'Message ID and emoji are required' });
        return;
      }

      // Verify message exists
      const message = await prisma.message.findUnique({
        where: { id: messageId }
      });

      if (!message) {
        socket.emit('reaction_error', { message: 'Message not found' });
        return;
      }

      // Check if reaction already exists
      const existingReaction = await prisma.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji
          }
        }
      });

      if (existingReaction) {
        // Remove reaction if it exists
        await prisma.messageReaction.delete({
          where: {
            id: existingReaction.id
          }
        });

        // Notify all participants
        io.to(`conversation_${message.conversationId}`).emit('reaction_removed', {
          messageId,
          userId,
          emoji,
          conversationId: message.conversationId
        });
      } else {
        // Add new reaction
        const reaction = await prisma.messageReaction.create({
          data: {
            messageId,
            userId,
            emoji
          },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        // Notify all participants
        io.to(`conversation_${message.conversationId}`).emit('reaction_added', {
          reaction,
          messageId,
          conversationId: message.conversationId
        });
      }

    } catch (error) {
      console.error('Error toggling reaction via WebSocket:', error);
      socket.emit('reaction_error', { message: 'Failed to toggle reaction' });
    }
  });

  // Handle message deletion via WebSocket
  socket.on('delete_message', async (data: { messageId: string }) => {
    try {
      const { messageId } = data;
      const userId = socketData.userId;

      if (!messageId) {
        socket.emit('delete_error', { message: 'Message ID is required' });
        return;
      }

      // Find the message and verify ownership
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId
        }
      });

      if (!message) {
        socket.emit('delete_error', { message: 'Message not found or not authorized to delete' });
        return;
      }

      // Delete the message (this will cascade to reactions due to foreign key)
      await prisma.message.delete({
        where: {
          id: messageId
        }
      });

      // Notify all participants
      io.to(`conversation_${message.conversationId}`).emit('message_deleted', {
        messageId,
        conversationId: message.conversationId
      });

    } catch (error) {
      console.error('Error deleting message via WebSocket:', error);
      socket.emit('delete_error', { message: 'Failed to delete message' });
    }
  });
};