import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SocketEvent } from '../lib/utils/socket/types';
import { handleConnection } from './socketHandlers';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', handleConnection);

// Start server
const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
}); 