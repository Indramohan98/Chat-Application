import { Server, Socket } from 'socket.io';
import prisma from '../../lib/prisma';

export const handleDisconnection = (socket: Socket, io: Server) => {
  const socketData = socket as any;

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`User ${socketData.user?.name || socketData.userId} disconnected`);

    // Mark user offline in DB
    const lastActive = new Date();
    await prisma.user.update({
      where: { id: socketData.userId },
      data: {
        isOnline: false,
        lastActive
      }
    });

    // Notify others this user is offline
    io.emit('user_status_changed', {
      userId: socketData.userId,
      isOnline: false,
      lastActive
    });
  });
};