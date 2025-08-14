import { Server, Socket } from 'socket.io';

export const handleTyping = (socket: Socket, io: Server) => {
  const socketData = socket as any;

  // Handle typing indicators
  socket.on('typing_start', (data: { conversationId: string }) => {
    socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId: socketData.userId,
      userName: socketData.user?.name,
      conversationId: data.conversationId,
      isTyping: true
    });
  });

  socket.on('typing_stop', (data: { conversationId: string }) => {
    socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId: socketData.userId,
      userName: socketData.user?.name,
      conversationId: data.conversationId,
      isTyping: false
    });
  });
};