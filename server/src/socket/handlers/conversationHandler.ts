import { Server, Socket } from 'socket.io';

export const handleConversation = (socket: Socket, io: Server) => {
  const socketData = socket as any;

  // Handle joining conversation rooms
  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socketData.userId} joined conversation ${conversationId}`);
  });

  // Handle leaving conversation rooms
  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User ${socketData.userId} left conversation ${conversationId}`);
  });
};