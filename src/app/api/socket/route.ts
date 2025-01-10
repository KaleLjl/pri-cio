import { Server } from 'socket.io';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const io = new Server({
  path: '/api/socket',
  addTrailingSlash: false,
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

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

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (conversationId: string) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined room: ${conversationId}`);
  });

  socket.on('leave-room', (conversationId: string) => {
    socket.leave(conversationId);
    console.log(`Socket ${socket.id} left room: ${conversationId}`);
  });

  socket.on('send-message', async (message) => {
    io.to(message.conversationId).emit('new-message', message);
  });

  socket.on('typing', (data) => {
    socket.to(data.conversationId).emit('user-typing', {
      userId: data.userId,
      typing: data.typing,
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

export async function GET(req: Request) {
  return NextResponse.json({ message: 'Socket server is running' });
} 