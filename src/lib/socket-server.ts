import { Server as SocketServer } from 'socket.io';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

let io: SocketServer;

export async function initSocketServer(server: any) {
  if (!io) {
    console.log('Initializing Socket.IO server...');

    io = new SocketServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
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

    io.on('connection', async (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-room', (conversationId: string) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined room: ${conversationId}`);
      });

      socket.on('leave-room', (conversationId: string) => {
        socket.leave(conversationId);
        console.log(`Socket ${socket.id} left room: ${conversationId}`);
      });

      socket.on('send-message', async (data: { conversationId: string; content: string }) => {
        try {
          const client = await clientPromise;
          const db = client.db('pri-cio');

          // Get conversation
          const conversation = await db.collection('conversations').findOne({
            _id: new ObjectId(data.conversationId),
            participants: socket.data.userId,
          });

          if (!conversation) {
            throw new Error('Conversation not found or unauthorized');
          }

          // Get receiver ID (the other participant)
          const receiverId = conversation.participants.find(
            (id: string) => id !== socket.data.userId
          );

          // Create and save message
          const message = {
            _id: new ObjectId(),
            conversationId: data.conversationId,
            senderId: socket.data.userId,
            receiverId,
            content: data.content,
            createdAt: new Date(),
            read: false,
          };

          await db.collection('messages').insertOne(message);

          // Update conversation's last message and timestamp
          await db.collection('conversations').updateOne(
            { _id: new ObjectId(data.conversationId) },
            {
              $set: {
                lastMessage: message,
                updatedAt: new Date(),
              },
            }
          );

          // Emit message to room
          io.to(data.conversationId).emit('new-message', {
            ...message,
            _id: message._id.toString(),
          });
        } catch (error) {
          console.error('Error handling message:', error);
          socket.emit('error', { message: 'Failed to send message' });
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
      });
    });
  }

  return io;
} 