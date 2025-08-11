import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (userId: string) => {
  if (!socket) {
    socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000', {
      auth: { userId },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    try {
      socket.disconnect();
    } catch (e) {
      // ignore
    }
    socket = null;
  }
};