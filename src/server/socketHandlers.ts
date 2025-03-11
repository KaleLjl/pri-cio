import { Socket } from 'socket.io';
import { SocketEvent } from '../lib/utils/socket/types';
import { ChatMessage } from '../lib/utils/socket/types';

export const handleConnection = (socket: Socket) => {
  const userId = socket.handshake.auth.userId;
  console.log(`User connected: ${userId}`);

  // Join room
  socket.on(SocketEvent.JOIN_ROOM, ({ roomId }) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room: ${roomId}`);
  });

  // Leave room
  socket.on(SocketEvent.LEAVE_ROOM, ({ roomId }) => {
    socket.leave(roomId);
    console.log(`User ${userId} left room: ${roomId}`);
  });

  // Handle messages
  socket.on(SocketEvent.SEND_MESSAGE, (message: ChatMessage) => {
    console.log(`Message received in room ${message.conversationId}:`, message);
    socket.to(message.conversationId).emit(SocketEvent.NEW_MESSAGE, message);
  });

  // Handle typing status
  socket.on(SocketEvent.SEND_TYPING, (data: { conversationId: string; userId: string; typing: boolean }) => {
    socket.to(data.conversationId).emit(SocketEvent.USER_TYPING, data);
  });

  // Handle message delivery confirmation
  socket.on(SocketEvent.SEND_MESSAGE_DELIVERED, ({ messageId }) => {
    socket.broadcast.emit(SocketEvent.MESSAGE_DELIVERED, messageId);
  });

  // Handle message read confirmation
  socket.on(SocketEvent.SEND_MESSAGE_READ, ({ messageId }) => {
    socket.broadcast.emit(SocketEvent.MESSAGE_READ, messageId);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
  });
}; 