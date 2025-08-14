import { Server, Socket } from 'socket.io';
import prisma from '../../lib/prisma';

export const handleUserStatus = (socket: Socket, io: Server) => {
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
};