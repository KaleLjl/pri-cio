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
  'send-message': (message: ChatMessage) => void;
  'message-read': (data: { messageId: string; conversationId: string }) => void;
  'typing': (data: { conversationId: string; userId: string; typing: boolean }) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId: string;
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

// Store online users
const onlineUsers = new Map<string, string>();

io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.query.userId;
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
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);
  const userId = socket.data.userId;
  
  // Store user's online status
  onlineUsers.set(userId, socket.id);
  
  // Notify user's contacts that they're online
  socket.broadcast.emit('user-online', userId);

  socket.on('join-room', (conversationId: string) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined room: ${conversationId}`);
  });

  socket.on('leave-room', (conversationId: string) => {
    socket.leave(conversationId);
    console.log(`Socket ${socket.id} left room: ${conversationId}`);
  });

  socket.on('send-message', async (message: ChatMessage) => {
    try {
      const client = await clientPromise;
      const db = client.db('pri-cio');
      
      // Update message status to delivered
      await db.collection('messages').updateOne(
        { _id: new ObjectId(message._id) },
        { $set: { status: 'delivered' } }
      );
      
      message.status = 'delivered';
      io.to(message.conversationId).emit('new-message', message);
      
      // Send delivered status to sender
      const senderSocket = onlineUsers.get(message.senderId);
      if (senderSocket) {
        io.to(senderSocket).emit('message-delivered', message._id);
      }
    } catch (error) {
      console.error('Error handling message:', error);
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
    onlineUsers.delete(userId);
    socket.broadcast.emit('user-offline', userId);
  });
});

export async function GET(req: Request) {
  return NextResponse.json({ message: 'Socket server is running' });
} 