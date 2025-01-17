// server/socket.ts
import { Server } from "socket.io";
import { createServer } from "http";
import { ChatMessage } from "@/lib/types/chat";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
});

const activeUsers = new Map<string, string>();
const conversationRooms = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (userId) {
    activeUsers.set(userId, socket.id);
  }

  socket.on("join-room", (conversationId: string) => {
    if (!conversationRooms.has(conversationId)) {
      conversationRooms.set(conversationId, new Set());
    }
    socket.join(conversationId);
    conversationRooms.get(conversationId)?.add(socket.id);

    socket.to(conversationId).emit("user-joined", { userId, socketId: socket.id });
  });

  socket.on("leave-room", (conversationId: string) => {
    socket.leave(conversationId);
    conversationRooms.get(conversationId)?.delete(socket.id);
    if (conversationRooms.get(conversationId)?.size === 0) {
      conversationRooms.delete(conversationId);
    }
    socket.to(conversationId).emit("user-left", { userId, socketId: socket.id });
  });

  socket.on("send-message", (message: ChatMessage) => {
    const broadcastMessage = {
      ...message,
      createdAt: message.createdAt || new Date().toISOString(),
    };

    io.in(message.conversationId).emit("new-message", broadcastMessage);
    socket.to(message.conversationId).emit("message-delivered", message._id);
  });

  socket.on("typing", ({ conversationId, userId, typing }) => {
    if (!socket.rooms.has(conversationId)) {
      socket.join(conversationId);
      conversationRooms.get(conversationId)?.add(socket.id);
    }
    socket.to(conversationId).emit("user-typing", { userId, typing });
  });

  socket.on("mark-read", ({ messageId, conversationId }) => {
    if (!socket.rooms.has(conversationId)) {
      socket.join(conversationId);
      conversationRooms.get(conversationId)?.add(socket.id);
    }
    socket.to(conversationId).emit("message-read", messageId);
  });

  socket.on("disconnect", (reason) => {
    if (userId) {
      conversationRooms.forEach((members, roomId) => {
        if (members.has(socket.id)) {
          members.delete(socket.id);
          if (members.size === 0) {
            conversationRooms.delete(roomId);
          }
          socket.to(roomId).emit("user-left", { userId, socketId: socket.id });
        }
      });
      activeUsers.delete(userId);
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

export default io;