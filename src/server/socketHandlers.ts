import { Socket } from 'socket.io';
import { SocketEvent } from '../lib/utils/socket/types';
import { ChatMessage } from '../lib/utils/socket/types';

export const handleConnection = (socket: Socket) => {
  const userId = socket.handshake.auth.userId;
  console.log(`[Socket] User connected: ${userId}`);
  console.log(`[Socket] Socket ID: ${socket.id}`);

  // Join room
  socket.on(SocketEvent.JOIN_ROOM, ({ roomId }) => {
    console.log(`[Socket] Joining room - User: ${userId}, Room: ${roomId}`);
    socket.join(roomId);
    console.log(`[Socket] Room joined successfully - User: ${userId}, Room: ${roomId}`);
    console.log(`[Socket] Current rooms for socket:`, Array.from(socket.rooms));
  });

  // Leave room
  socket.on(SocketEvent.LEAVE_ROOM, ({ roomId }) => {
    console.log(`[Socket] Leaving room - User: ${userId}, Room: ${roomId}`);
    socket.leave(roomId);
    console.log(`[Socket] Room left successfully - User: ${userId}, Room: ${roomId}`);
    console.log(`[Socket] Current rooms for socket:`, Array.from(socket.rooms));
  });

  // Handle messages
  socket.on(SocketEvent.SEND_MESSAGE, (message: ChatMessage) => {
    console.log(`[Socket] Message received from client:`, {
      messageId: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      timestamp: new Date().toISOString()
    });

    // Log rooms before broadcasting
    console.log(`[Socket] Current rooms for socket:`, Array.from(socket.rooms));
    console.log(`[Socket] Broadcasting message to room: ${message.conversationId}`);
    
    socket.to(message.conversationId).emit(SocketEvent.NEW_MESSAGE, message);
    
    console.log(`[Socket] Message broadcast complete to room: ${message.conversationId}`);
    
    // Also emit a new conversation event if this is a new conversation
    console.log(`[Socket] Emitting new conversation event to receiver: ${message.receiverId}`);
    socket.to(message.receiverId).emit(SocketEvent.NEW_CONVERSATION, {
      conversationId: message.conversationId,
      message
    });
  });

  // Handle typing status
  socket.on(SocketEvent.SEND_TYPING, (data: { conversationId: string; userId: string; typing: boolean }) => {
    console.log(`[Socket] Typing status update:`, {
      userId: data.userId,
      conversationId: data.conversationId,
      typing: data.typing,
      timestamp: new Date().toISOString()
    });
    socket.to(data.conversationId).emit(SocketEvent.TYPING, data);
    console.log(`[Socket] Typing status broadcast complete to room: ${data.conversationId}`);
  });

  // Handle message delivery confirmation
  socket.on(SocketEvent.SEND_MESSAGE_DELIVERED, ({ messageId }) => {
    console.log(`[Socket] Message delivery confirmation:`, {
      messageId,
      userId,
      timestamp: new Date().toISOString()
    });
    socket.broadcast.emit(SocketEvent.MESSAGE_DELIVERED, messageId);
    console.log(`[Socket] Message delivery broadcast complete: ${messageId}`);
  });

  // Handle message read confirmation
  socket.on(SocketEvent.SEND_MESSAGE_READ, ({ messageId }) => {
    console.log(`[Socket] Message read confirmation:`, {
      messageId,
      userId,
      timestamp: new Date().toISOString()
    });
    socket.broadcast.emit(SocketEvent.MESSAGE_READ, messageId);
    console.log(`[Socket] Message read broadcast complete: ${messageId}`);
  });

  // Handle conversation read status
  socket.on(SocketEvent.CONVERSATION_READ, (data: { conversationId: string }) => {
    console.log(`[Socket] Conversation read status:`, {
      conversationId: data.conversationId,
      userId,
      timestamp: new Date().toISOString()
    });
    socket.to(data.conversationId).emit(SocketEvent.CONVERSATION_READ, data);
    console.log(`[Socket] Conversation read broadcast complete: ${data.conversationId}`);
  });

  // Handle explore posts updates
  socket.on(SocketEvent.EXPLORE_POSTS_UPDATE, (data: { userId: string }) => {
    console.log(`[Socket] Explore posts update:`, {
      fromUserId: userId,
      forUserId: data.userId,
      timestamp: new Date().toISOString()
    });
    socket.broadcast.emit(SocketEvent.EXPLORE_POSTS_UPDATE, data);
    console.log(`[Socket] Explore posts update broadcast complete`);
  });

  // Handle disconnection
  socket.on(SocketEvent.DISCONNECT, () => {
    console.log(`[Socket] User disconnected:`, {
      userId,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      rooms: Array.from(socket.rooms)
    });
  });
}; 