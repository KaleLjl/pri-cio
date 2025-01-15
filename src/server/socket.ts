import { Server } from 'socket.io';
import { createServer } from 'http';
import { ChatMessage } from '@/lib/types/chat';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  }
});

// Store active users and their socket connections
const activeUsers = new Map<string, string>();
// Store conversation rooms and their members
const conversationRooms = new Map<string, Set<string>>();

// Debug: Print active users
function printActiveUsers() {
  console.log('Current active users:', Array.from(activeUsers.entries()));
}

// Debug: Print room members
function printRoomMembers(conversationId: string) {
  const members = conversationRooms.get(conversationId);
  console.log(`Room ${conversationId} members:`, Array.from(members || []));
}

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (userId) {
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} connected with socket ${socket.id}`);
    printActiveUsers();
  }

  // Join a chat room
  socket.on('join-room', (conversationId: string) => {
    if (!conversationRooms.has(conversationId)) {
      conversationRooms.set(conversationId, new Set());
    }
    
    socket.join(conversationId);
    conversationRooms.get(conversationId)?.add(socket.id);
    
    console.log(`User ${userId} joined room ${conversationId} with socket ${socket.id}`);
    printRoomMembers(conversationId);
    
    // Notify other users in the room
    socket.to(conversationId).emit('user-joined', { userId, socketId: socket.id });
  });

  // Leave a chat room
  socket.on('leave-room', (conversationId: string) => {
    socket.leave(conversationId);
    conversationRooms.get(conversationId)?.delete(socket.id);
    if (conversationRooms.get(conversationId)?.size === 0) {
      conversationRooms.delete(conversationId);
    }
    console.log(`User ${userId} left room ${conversationId}`);
    printRoomMembers(conversationId);
    
    // Notify other users in the room
    socket.to(conversationId).emit('user-left', { userId, socketId: socket.id });
  });

  // Handle new messages
  socket.on('send-message', (message: ChatMessage) => {
    console.log(`Received message from ${message.senderId} in conversation ${message.conversationId}:`, message);
    
    // Make sure sender is in the room
    if (!socket.rooms.has(message.conversationId)) {
      console.log(`Auto-joining sender to room ${message.conversationId}`);
      socket.join(message.conversationId);
      conversationRooms.get(message.conversationId)?.add(socket.id);
    }
    
    // Debug: Check room existence and members
    const roomMembers = conversationRooms.get(message.conversationId);
    console.log(`Room ${message.conversationId} exists:`, !!roomMembers);
    console.log(`Room members:`, Array.from(roomMembers || []));
    
    // Broadcast to all users in the conversation (including sender for consistency)
    io.in(message.conversationId).emit('new-message', message);
    console.log(`Broadcasted message to room ${message.conversationId}`);
    
    // Mark as delivered for other users
    socket.to(message.conversationId).emit('message-delivered', message._id);
    console.log(`Marked message ${message._id} as delivered`);
  });

  // Handle typing status
  socket.on('typing', ({ conversationId, userId, typing }: { conversationId: string; userId: string; typing: boolean }) => {
    // Make sure sender is in the room
    if (!socket.rooms.has(conversationId)) {
      console.log(`Auto-joining sender to room ${conversationId}`);
      socket.join(conversationId);
      conversationRooms.get(conversationId)?.add(socket.id);
    }
    
    console.log(`User ${userId} is ${typing ? 'typing' : 'stopped typing'} in conversation ${conversationId}`);
    socket.to(conversationId).emit('user-typing', { userId, typing });
  });

  // Handle message read status
  socket.on('mark-read', ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
    // Make sure sender is in the room
    if (!socket.rooms.has(conversationId)) {
      console.log(`Auto-joining sender to room ${conversationId}`);
      socket.join(conversationId);
      conversationRooms.get(conversationId)?.add(socket.id);
    }
    
    console.log(`Message ${messageId} marked as read in conversation ${conversationId}`);
    socket.to(conversationId).emit('message-read', messageId);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    if (userId) {
      // Remove user from all rooms they were in
      conversationRooms.forEach((members, roomId) => {
        if (members.has(socket.id)) {
          members.delete(socket.id);
          if (members.size === 0) {
            conversationRooms.delete(roomId);
          }
          // Notify other users in the room
          socket.to(roomId).emit('user-left', { userId, socketId: socket.id });
        }
      });
      
      activeUsers.delete(userId);
      console.log(`User ${userId} disconnected. Reason: ${reason}`);
      printActiveUsers();
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

export default io; 