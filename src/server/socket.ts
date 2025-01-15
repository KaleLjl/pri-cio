import { Server } from 'socket.io';
import { createServer } from 'http';
import { ChatMessage } from '@/lib/types/chat';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store active users and their socket connections
const activeUsers = new Map<string, string>();

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (userId) {
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} connected`);
  }

  // Join a chat room
  socket.on('join-room', (conversationId: string) => {
    socket.join(conversationId);
    console.log(`User ${userId} joined room ${conversationId}`);
  });

  // Leave a chat room
  socket.on('leave-room', (conversationId: string) => {
    socket.leave(conversationId);
    console.log(`User ${userId} left room ${conversationId}`);
  });

  // Handle new messages
  socket.on('send-message', (message: ChatMessage) => {
    // Broadcast to all users in the conversation
    io.to(message.conversationId).emit('new-message', message);
    
    // Mark as delivered for other users
    socket.to(message.conversationId).emit('message-delivered', message._id);
  });

  // Handle typing status
  socket.on('typing', ({ conversationId, userId, typing }: { conversationId: string; userId: string; typing: boolean }) => {
    socket.to(conversationId).emit('user-typing', { userId, typing });
  });

  // Handle message read status
  socket.on('mark-read', ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
    socket.to(conversationId).emit('message-read', messageId);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (userId) {
      activeUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

export default io; 