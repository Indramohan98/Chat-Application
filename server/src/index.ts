
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import userRoutes from './routes/userRoutes';
import messageRoutes from './routes/messageRoutes';
import prisma from './lib/prisma';

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5174',
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.use(express.json());

// Enable CORS for your frontend
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true,
}));

// Middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// Make io accessible to routes
app.set('io', io);

app.use('/api/user', userRoutes);
app.use('/api/messages', messageRoutes);

// Socket.IO authentication middleware
io.use(async (socket: any, next) => {
  try {
    const userId = socket.handshake.auth.userId;
    
    if (!userId) {
      return next(new Error('User ID is required for socket connection'));
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      return next(new Error('Invalid user ID'));
    }
    
    socket.user = user;
    socket.userId = userId;
    
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    next(new Error('Authentication failed'));
  }
});

// Socket.IO connection handling
io.on('connection', async(socket: any) => {
  console.log(`User ${socket.user?.name || socket.userId} connected`);

  // Mark user online in DB
  await prisma.user.update({
    where: { id: socket.userId },
    data: {
      isOnline: true,
      lastActive: new Date()
    }
  });

  // Notify friends or relevant users that this user is online
  io.emit('user_status_changed', {
    userId: socket.userId,
    isOnline: true,
    lastActive: new Date()
  });

  // Join user to their personal room for notifications
  socket.join(`user_${socket.userId}`);

  // Handle request for all user statuses
  socket.on('request_user_statuses', async () => {
    try {
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          isOnline: true,
          lastActive: true
        }
      });

      const userStatuses = allUsers.map(user => ({
        userId: user.id,
        isOnline: user.isOnline,
        lastActive: user.lastActive || new Date()
      }));

      socket.emit('user_statuses_response', userStatuses);
    } catch (error) {
      console.error('Error fetching user statuses:', error);
    }
  });

  // Handle request for specific user statuses
  socket.on('request_specific_user_statuses', async (data: { userIds: string[] }) => {
    try {
      const { userIds } = data;
      
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: userIds
          }
        },
        select: {
          id: true,
          isOnline: true,
          lastActive: true
        }
      });

      const userStatuses = users.map(user => ({
        userId: user.id,
        isOnline: user.isOnline,
        lastActive: user.lastActive || new Date()
      }));

      socket.emit('user_statuses_response', userStatuses);
    } catch (error) {
      console.error('Error fetching specific user statuses:', error);
    }
  });

  // Handle joining conversation rooms
  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Handle leaving conversation rooms
  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} left conversation ${conversationId}`);
  });

  // Handle sending messages via WebSocket
  socket.on('send_message', async (data: {
    conversationId: string;
    content?: string;
    imageUrl?: string;
  }) => {
    try {
      const { conversationId, content, imageUrl } = data;
      const senderId = socket.userId;

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
      const userId = socket.userId;

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
      const userId = socket.userId;

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

  // Handle typing indicators
  socket.on('typing_start', (data: { conversationId: string }) => {
    socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId: socket.userId,
      userName: socket.user?.name,
      conversationId: data.conversationId,
      isTyping: true
    });
  });

  socket.on('typing_stop', (data: { conversationId: string }) => {
    socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId: socket.userId,
      userName: socket.user?.name,
      conversationId: data.conversationId,
      isTyping: false
    });
  });

  // Handle disconnect
  socket.on('disconnect', async() => {
    console.log(`User ${socket.user?.name || socket.userId} disconnected`);

    // Mark user offline in DB
    const lastActive = new Date();
    await prisma.user.update({
      where: { id: socket.userId },
      data: {
        isOnline: false,
        lastActive
      }
    });

    // Notify others this user is offline
    io.emit('user_status_changed', {
      userId: socket.userId,
      isOnline: false,
      lastActive
    });
  });
});

// Use httpServer instead of app for listening
httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Socket.IO server initialized`);
});

export default app;