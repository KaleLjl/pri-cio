// lib/socket.ts
import { io, Socket } from "socket.io-client";
import { ChatMessage } from "./types/chat";

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
      console.log("Already connected with the same user ID");
      return;
    }

    if (this.socket) {
      console.log("Cleaning up existing connection");
      this.disconnect();
    }

    this.userId = userId;
    console.log("Initiating socket connection for user:", userId);

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      query: { userId },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"],
      forceNew: true,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // 先移除所有现有的监听器
    this.socket.removeAllListeners();
    this.eventHandlers.clear();

    this.socket.on("connect", () => {
      console.log("Connected to socket server with ID:", this.socket?.id);
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();

      // Rejoin rooms
      this.activeRooms.forEach((roomId) => {
        console.log("Rejoining room:", roomId);
        this.socket?.emit("join-room", roomId);
      });
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.handleDisconnection("connect_error");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from socket server. Reason:", reason);
      this.handleDisconnection(reason);
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      this.handleDisconnection("error");
    });
  }

  private handleDisconnection(reason: string) {
    this.reconnectAttempts++;
    console.log(`Handling disconnection (attempt ${this.reconnectAttempts}). Reason:`, reason);

    if (this.autoReconnectEnabled && this.userId) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
          console.log("Attempting to reconnect...");
          this.connect(this.userId!);
        }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000));
      } else {
        console.error("Max reconnection attempts reached");
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
      handlers.forEach((handler) => {
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
      console.log("Disconnecting socket...");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.reconnectAttempts = 0;
      this.eventHandlers.clear();
      this.activeRooms.clear();
      this.autoReconnectEnabled = true;
    }
  }

  joinRoom(conversationId: string) {
    if (!this.socket?.connected) {
      console.error("Cannot join room: Socket not connected");
      this.activeRooms.add(conversationId);
      return;
    }
    console.log("Joining room:", conversationId);
    this.activeRooms.add(conversationId);
    this.socket.emit("join-room", conversationId);
  }

  leaveRoom(conversationId: string) {
    this.activeRooms.delete(conversationId);
    if (!this.socket?.connected) {
      console.error("Cannot leave room: Socket not connected");
      return;
    }
    console.log("Leaving room:", conversationId);
    this.socket.emit("leave-room", conversationId);
  }

  sendMessage(message: ChatMessage) {
    if (!this.socket?.connected) {
      console.error("Cannot send message: Socket not connected");
      return;
    }
    console.log("Sending message:", message);
    this.socket.emit("send-message", message);
  }

  sendTyping(data: { conversationId: string; userId: string; typing: boolean }) {
    if (!this.socket?.connected) {
      console.error("Cannot send typing status: Socket not connected");
      return;
    }
    this.socket.emit("typing", data);
  }

  markMessageRead(data: { messageId: string; conversationId: string }) {
    if (!this.socket?.connected) {
      console.error("Cannot mark message as read: Socket not connected");
      return;
    }
    this.socket.emit("mark-read", data);
  }

  onNewMessage(callback: (message: ChatMessage) => void) {
    if (!this.socket) {
      console.error("Cannot set up new-message listener: Socket not initialized");
      return;
    }

    const handler = (message: ChatMessage) => {
      console.log("Socket received new message:", message);
      callback(message);
    };

    // 先移除旧的监听器
    this.socket.off("new-message", handler);
    // 添加新的监听器
    this.socket.on("new-message", handler);
    this.addEventHandler("new-message", handler);

    return () => {
      this.socket?.off("new-message", handler);
      const handlers = this.eventHandlers.get("new-message");
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  onMessageDelivered(callback: (messageId: string) => void) {
    if (!this.socket) return;
    const handler = (messageId: string) => {
      console.log("Message delivered:", messageId);
      callback(messageId);
    };
    this.socket.on("message-delivered", handler);
    this.addEventHandler("message-delivered", handler);
  }

  onMessageRead(callback: (messageId: string) => void) {
    if (!this.socket) return;
    const handler = (messageId: string) => {
      console.log("Message read:", messageId);
      callback(messageId);
    };
    this.socket.on("message-read", handler);
    this.addEventHandler("message-read", handler);
  }

  onNewConversation(callback: (data: { conversationId: string; message: ChatMessage }) => void) {
    if (!this.socket) return;
    const handler = (data: { conversationId: string; message: ChatMessage }) => {
      console.log("New conversation received:", data);
      callback(data);
    };
    this.socket.on("new-conversation", handler);
    this.addEventHandler("new-conversation", handler);
  }

  onConversationRead(callback: (data: { conversationId: string }) => void) {
    if (!this.socket) return;
    const handler = (data: { conversationId: string }) => {
      console.log("Conversation read:", data);
      callback(data);
    };
    this.socket.on("conversation-read", handler);
    this.addEventHandler("conversation-read", handler);
  }

  onUserTyping(callback: (data: { userId: string; typing: boolean }) => void) {
    if (!this.socket) return;
    const handler = (data: { userId: string; typing: boolean }) => {
      console.log("User typing status:", data);
      callback(data);
    };
    this.socket.on("user-typing", handler);
    this.addEventHandler("user-typing", handler);
  }

  onExplorePostsUpdate(callback: (data: { userId: string }) => void) {
    if (!this.socket) return;
    const handler = (data: { userId: string }) => {
      console.log("Explore posts updated for user:", data);
      callback(data);
    };
    this.socket.on("explore-posts-update", handler);
    this.addEventHandler("explore-posts-update", handler);
  }

  emitExplorePostsUpdate(userId: string) {
    if (!this.socket?.connected) {
      console.error("Cannot emit explore posts update: Socket not connected");
      return;
    }
    console.log("Emitting explore posts update for user:", userId);
    this.socket.emit("explore-posts-update", userId);
  }

  removeAllListeners() {
    if (this.socket) {
      console.log("Removing specific event listeners");
      this.socket.off("user-typing");
      this.socket.off("message-delivered");
      this.socket.off("message-read");
      // 也可以继续下去
      ["user-typing", "message-delivered", "message-read", "new-message"].forEach((event) => {
        this.eventHandlers.delete(event);
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  removeEventListener(event: string, handler: (...args: any[]) => void) {
    if (this.socket) {
      console.log(`Removing listener for event: ${event}`);
      this.socket.off(event, handler);
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    }
  }

  onConnect(callback: () => void) {
    this.socket?.on("connect", callback);
  }

  // Send message delivered status
  sendMessageDelivered(messageId: string) {
    if (this.socket) {
      this.socket.emit('message-delivered', messageId);
    }
  }

  // Send message read status
  sendMessageRead(messageId: string) {
    if (this.socket) {
      this.socket.emit('message-read', messageId);
    }
  }

  // Update message status in database
  async updateMessageStatus(messageId: string, status: string) {
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update message status');
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }
}

export const socketService = SocketService.getInstance();