import { Server, Socket } from 'socket.io';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { ChatMessage } from '@/lib/types/chat';

interface ServerToClientEvents {
  'new-message': (message: ChatMessage) => void;
  'message-delivered': (messageId: string) => void;
  'message-read': (messageId: string) => void;
  'user-typing': (data: { userId: string; typing: boolean }) => void;
  'user-online': (userId: string) => void;
  'user-offline': (userId: string) => void;
}

interface ClientToServerEvents {
  'join-room': (conversationId: string) => void;
  'leave-room': (conversationId: string) => void;
  'send-message': (message: ChatMessage & { recipientId: string }) => void;
  'message-received': (data: { messageId: string; conversationId: string; receiverId: string }) => void;
  'message-read': (data: { messageId: string; conversationId: string }) => void;
  'typing': (data: { conversationId: string; userId: string; typing: boolean }) => void;
  'subscribe': (data: { userId: string; conversationId: string }) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId: string;
  conversationId?: string;
}

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>({
  path: '/api/socket',
  addTrailingSlash: false,
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket'],
  connectTimeout: 10000,
});

// Store online users and their conversation subscriptions
const onlineUsers = new Map<string, string>();
const userConversations = new Map<string, Set<string>>();

io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.query.userId;
    const conversationId = socket.handshake.query.conversationId;
    
    if (!userId || typeof userId !== 'string' || !ObjectId.isValid(userId)) {
      next(new Error('Invalid user ID'));
      return;
    }

    const client = await clientPromise;
    const db = client.db('pri-cio');
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      next(new Error('User not found'));
      return;
    }

    socket.data.userId = userId;
    if (conversationId && typeof conversationId === 'string') {
      socket.data.conversationId = conversationId;
    }
    
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);
  const userId = socket.data.userId;
  const conversationId = socket.data.conversationId;
  
  // Store user's online status and socket ID
  onlineUsers.set(userId, socket.id);
  
  // Initialize user's conversation set if not exists
  if (!userConversations.has(userId)) {
    userConversations.set(userId, new Set());
  }
  
  // Add initial conversation if provided
  if (conversationId) {
    userConversations.get(userId)?.add(conversationId);
    socket.join(conversationId);
  }
  
  // Notify user's contacts that they're online
  socket.broadcast.emit('user-online', userId);

  socket.on('subscribe', (data) => {
    const { userId, conversationId } = data;
    userConversations.get(userId)?.add(conversationId);
    socket.join(conversationId);
    console.log(`Socket ${socket.id} subscribed to conversation: ${conversationId}`);
  });

  socket.on('join-room', (conversationId: string) => {
    socket.join(conversationId);
    userConversations.get(userId)?.add(conversationId);
    console.log(`Socket ${socket.id} joined room: ${conversationId}`);
  });

  socket.on('leave-room', (conversationId: string) => {
    socket.leave(conversationId);
    userConversations.get(userId)?.delete(conversationId);
    console.log(`Socket ${socket.id} left room: ${conversationId}`);
  });

  socket.on('send-message', async (message: ChatMessage & { recipientId: string }) => {
    try {
      const client = await clientPromise;
      const db = client.db('pri-cio');
      
      // Update message status to sent
      await db.collection('messages').updateOne(
        { _id: new ObjectId(message._id) },
        { $set: { status: 'sent' } }
      );
      
      message.status = 'sent';
      
      // Send to all sockets in the conversation room
      io.to(message.conversationId).emit('new-message', message);
      
      // If recipient is online and in the conversation, mark as delivered
      const recipientSocket = onlineUsers.get(message.recipientId);
      const isRecipientInConversation = userConversations.get(message.recipientId)?.has(message.conversationId);
      
      if (recipientSocket && isRecipientInConversation) {
        await db.collection('messages').updateOne(
          { _id: new ObjectId(message._id) },
          { $set: { status: 'delivered' } }
        );
        
        message.status = 'delivered';
        io.to(recipientSocket).emit('message-delivered', message._id);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  socket.on('message-received', async (data) => {
    try {
      const client = await clientPromise;
      const db = client.db('pri-cio');
      
      // Update message status to delivered
      await db.collection('messages').updateOne(
        { _id: new ObjectId(data.messageId) },
        { $set: { status: 'delivered' } }
      );
      
      // Notify sender
      const message = await db.collection('messages').findOne({ _id: new ObjectId(data.messageId) });
      if (message) {
        const senderSocket = onlineUsers.get(message.senderId);
        if (senderSocket) {
          io.to(senderSocket).emit('message-delivered', data.messageId);
        }
      }
    } catch (error) {
      console.error('Error handling message received:', error);
    }
  });

  socket.on('message-read', async (data: { messageId: string; conversationId: string }) => {
    try {
      const client = await clientPromise;
      const db = client.db('pri-cio');
      
      // Update message status to read
      await db.collection('messages').updateOne(
        { _id: new ObjectId(data.messageId) },
        { $set: { status: 'read' } }
      );
      
      // Notify message sender
      const message = await db.collection('messages').findOne({ _id: new ObjectId(data.messageId) });
      if (message) {
        const senderSocket = onlineUsers.get(message.senderId);
        if (senderSocket) {
          io.to(senderSocket).emit('message-read', data.messageId);
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  socket.on('typing', (data: { conversationId: string; userId: string; typing: boolean }) => {
    socket.to(data.conversationId).emit('user-typing', {
      userId: data.userId,
      typing: data.typing,
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up user's data
    onlineUsers.delete(userId);
    userConversations.delete(userId);
    socket.broadcast.emit('user-offline', userId);
  });
});

export async function GET(req: Request) {
  return NextResponse.json({ message: 'Socket server is running' });
} 