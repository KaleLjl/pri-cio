import { io, Socket } from 'socket.io-client';
import { ChatMessage } from './types/chat';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers = new Map<string, Set<(...args: any[]) => void>>();
  private activeRooms = new Set<string>();
  private autoReconnectEnabled = true;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(userId: string) {
    if (this.socket?.connected && this.userId === userId) {
      console.log('Already connected with the same user ID');
      return;
    }

    // Cleanup existing connection if any
    if (this.socket) {
      console.log('Cleaning up existing connection');
      this.disconnect();
    }

    this.userId = userId;
    console.log('Initiating socket connection for user:', userId);

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      query: { userId },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      forceNew: true
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to socket server with ID:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      
      // Rejoin all active rooms after reconnection
      this.activeRooms.forEach(roomId => {
        console.log('Rejoining room after reconnection:', roomId);
        this.socket?.emit('join-room', roomId);
      });
      
      // Re-register all event handlers after reconnection
      this.reattachEventHandlers();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleDisconnection('connect_error');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server. Reason:', reason);
      this.handleDisconnection(reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.handleDisconnection('error');
    });

    // Handle room events
    this.socket.on('user-joined', (data: { userId: string; socketId: string }) => {
      console.log(`User ${data.userId} joined with socket ${data.socketId}`);
    });

    this.socket.on('user-left', (data: { userId: string; socketId: string }) => {
      console.log(`User ${data.userId} left with socket ${data.socketId}`);
    });
  }

  private handleDisconnection(reason: string) {
    this.reconnectAttempts++;
    console.log(`Handling disconnection (attempt ${this.reconnectAttempts}). Reason:`, reason);

    if (this.autoReconnectEnabled && this.userId) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        // Set up reconnection timer
        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
          console.log('Attempting to reconnect...');
          this.connect(this.userId!);
        }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)); // Exponential backoff, max 10s
      } else {
        console.error('Max reconnection attempts reached');
        this.autoReconnectEnabled = false;
      }
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private reattachEventHandlers() {
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket?.on(event, handler);
      });
    });
  }

  private addEventHandler(event: string, handler: (...args: any[]) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  disconnect() {
    this.clearReconnectTimer();
    if (this.socket) {
      console.log('Disconnecting socket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.reconnectAttempts = 0;
      this.eventHandlers.clear();
      this.autoReconnectEnabled = true;
    }
  }

  joinRoom(conversationId: string) {
    if (!this.socket?.connected) {
      console.error('Cannot join room: Socket not connected');
      // Store the room ID even if we're not connected
      this.activeRooms.add(conversationId);
      return;
    }
    console.log('Joining room:', conversationId);
    this.activeRooms.add(conversationId);
    this.socket.emit('join-room', conversationId);
  }

  leaveRoom(conversationId: string) {
    this.activeRooms.delete(conversationId);
    if (!this.socket?.connected) {
      console.error('Cannot leave room: Socket not connected');
      return;
    }
    console.log('Leaving room:', conversationId);
    this.socket.emit('leave-room', conversationId);
  }

  sendMessage(message: ChatMessage) {
    if (!this.socket?.connected) {
      console.error('Cannot send message: Socket not connected');
      return;
    }
    console.log('Sending message:', message);
    this.socket.emit('send-message', message);
  }

  sendTyping(data: { conversationId: string; userId: string; typing: boolean }) {
    if (!this.socket?.connected) {
      console.error('Cannot send typing status: Socket not connected');
      return;
    }
    this.socket.emit('typing', data);
  }

  markMessageRead(data: { messageId: string; conversationId: string }) {
    if (!this.socket?.connected) {
      console.error('Cannot mark message as read: Socket not connected');
      return;
    }
    this.socket.emit('mark-read', data);
  }

  onNewMessage(callback: (message: ChatMessage) => void) {
    if (!this.socket) {
      console.error('Cannot set up message listener: Socket not initialized');
      return;
    }
    console.log('Setting up new message listener');
    const handler = (message: ChatMessage) => {
      console.log('Received new message:', message);
      callback(message);
    };
    this.socket.on('new-message', handler);
    this.addEventHandler('new-message', handler);
  }

  onMessageDelivered(callback: (messageId: string) => void) {
    if (!this.socket) {
      console.error('Cannot set up message delivered listener: Socket not initialized');
      return;
    }
    const handler = (messageId: string) => {
      console.log('Message delivered:', messageId);
      callback(messageId);
    };
    this.socket.on('message-delivered', handler);
    this.addEventHandler('message-delivered', handler);
  }

  onMessageRead(callback: (messageId: string) => void) {
    if (!this.socket) {
      console.error('Cannot set up message read listener: Socket not initialized');
      return;
    }
    const handler = (messageId: string) => {
      console.log('Message read:', messageId);
      callback(messageId);
    };
    this.socket.on('message-read', handler);
    this.addEventHandler('message-read', handler);
  }

  onUserTyping(callback: (data: { userId: string; typing: boolean }) => void) {
    if (!this.socket) {
      console.error('Cannot set up typing listener: Socket not initialized');
      return;
    }
    const handler = (data: { userId: string; typing: boolean }) => {
      console.log('User typing status:', data);
      callback(data);
    };
    this.socket.on('user-typing', handler);
    this.addEventHandler('user-typing', handler);
  }

  removeAllListeners() {
    if (this.socket) {
      console.log('Removing all socket listeners');
      this.socket.removeAllListeners();
      this.eventHandlers.clear();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  removeEventListener(event: string, handler: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, handler);
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    }
  }
}

export const socketService = SocketService.getInstance(); 