import { Socket } from 'socket.io';
import prisma from '../../lib/prisma';

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
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
    
    // Attach user data to socket
    (socket as any).user = user;
    (socket as any).userId = userId;
    
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    next(new Error('Authentication failed'));
  }
};