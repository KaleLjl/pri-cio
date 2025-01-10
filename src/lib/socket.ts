import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';
import { auth } from '@/lib/auth';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

let io: SocketIOServer;

export const initSocket = (res: NextApiResponseServerIO) => {
  if (!io) {
    console.log('Initializing socket.io server...');
    
    const path = '/api/socket';
    io = new SocketIOServer(res.socket.server, {
      path: path,
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    io.use(async (socket, next) => {
      try {
        const session = await auth();
        if (!session?.user?.email) {
          next(new Error('Unauthorized'));
          return;
        }
        socket.data.email = session.user.email;
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

    res.socket.server.io = io;
  }
  return io;
}; 