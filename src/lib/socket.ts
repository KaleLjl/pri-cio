import { io, Socket } from 'socket.io-client';
import { ChatMessage } from './types/chat';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(userId: string) {
    if (this.socket?.connected && this.userId === userId) {
      return;
    }

    this.userId = userId;
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      query: { userId },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  joinRoom(conversationId: string) {
    this.socket?.emit('join-room', conversationId);
  }

  leaveRoom(conversationId: string) {
    this.socket?.emit('leave-room', conversationId);
  }

  sendMessage(message: ChatMessage) {
    this.socket?.emit('send-message', message);
  }

  sendTyping(data: { conversationId: string; userId: string; typing: boolean }) {
    this.socket?.emit('typing', data);
  }

  markMessageRead(data: { messageId: string; conversationId: string }) {
    this.socket?.emit('mark-read', data);
  }

  onNewMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on('new-message', callback);
  }

  onMessageDelivered(callback: (messageId: string) => void) {
    this.socket?.on('message-delivered', callback);
  }

  onMessageRead(callback: (messageId: string) => void) {
    this.socket?.on('message-read', callback);
  }

  onUserTyping(callback: (data: { userId: string; typing: boolean }) => void) {
    this.socket?.on('user-typing', callback);
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export const socketService = SocketService.getInstance(); 