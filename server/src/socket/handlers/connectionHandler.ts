import { Server, Socket } from 'socket.io';
import prisma from '../../lib/prisma';

export const handleConnection = async (socket: Socket, io: Server) => {
  const socketData = socket as any;
  console.log(`User ${socketData.user?.name || socketData.userId} connected`);

  // Mark user online in DB
  await prisma.user.update({
    where: { id: socketData.userId },
    data: {
      isOnline: true,
      lastActive: new Date()
    }
  });

  // Notify friends or relevant users that this user is online
  io.emit('user_status_changed', {
    userId: socketData.userId,
    isOnline: true,
    lastActive: new Date()
  });

  // Join user to their personal room for notifications
  socket.join(`user_${socketData.userId}`);
};