// lib/socket.ts
import { io, Socket } from "socket.io-client";
import { ChatMessage } from "./types/chat";

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  // private eventHandlers = new Map<string, Set<(...args: any[]) => void>>(); // Removed
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

    this.socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
      {
        query: { userId },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ["websocket", "polling"],
        forceNew: true, // Consider if this is still needed
      }
    );

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // 先移除所有现有的监听器
    this.socket.removeAllListeners();
    // this.eventHandlers.clear(); // Removed

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
    console.log(
      `Handling disconnection (attempt ${this.reconnectAttempts}). Reason:`,
      reason
    );

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

  // Removed reattachEventHandlers method
  // Removed addEventHandler method

  disconnect() {
    this.clearReconnectTimer();
    if (this.socket) {
      console.log("Disconnecting socket...");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.reconnectAttempts = 0;
      // this.eventHandlers.clear(); // Removed
      this.activeRooms.clear();
      this.autoReconnectEnabled = true;
    }
  }

  joinRoom(conversationId: string) {
    if (!this.socket?.connected) {
      console.log("Socket not connected, queueing room join:", conversationId);
      this.activeRooms.add(conversationId);

      // 如果socket未连接，等待连接后重试
      if (this.socket) {
        this.socket.once("connect", () => {
          console.log(
            "Socket reconnected, joining queued room:",
            conversationId
          );
          this.socket?.emit("join-room", conversationId);
        });
      }
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

  sendTyping(data: {
    conversationId: string;
    userId: string;
    typing: boolean;
  }) {
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

  // --- Listener Setup Methods ---

  onNewMessage(callback: (message: ChatMessage) => void) {
    if (!this.socket) {
      console.error(
        "Cannot set up new-message listener: Socket not initialized"
      );
      return;
    }
    const handler = (message: ChatMessage) => {
      console.log("Socket received new message:", message);
      callback(message);
    };
    // Add listener directly
    this.socket.on("new-message", handler);
    // Return cleanup function
    return () => this.socket?.off("new-message", handler);
  }

  onMessageDelivered(callback: (messageId: string) => void) {
    if (!this.socket) return;
    const handler = (messageId: string) => {
      console.log("Message delivered:", messageId);
      callback(messageId);
    };
    this.socket.on("message-delivered", handler);
    return () => this.socket?.off("message-delivered", handler);
  }

  onMessageRead(callback: (messageId: string) => void) {
    if (!this.socket) return;
    const handler = (messageId: string) => {
      console.log("Message read:", messageId);
      callback(messageId);
    };
    this.socket.on("message-read", handler);
    return () => this.socket?.off("message-read", handler);
  }

  onNewConversation(
    callback: (data: { conversationId: string; message: ChatMessage }) => void
  ) {
    if (!this.socket) return;
    const handler = (data: {
      conversationId: string;
      message: ChatMessage;
    }) => {
      console.log("New conversation received:", data);
      callback(data);
    };
    this.socket.on("new-conversation", handler);
    return () => this.socket?.off("new-conversation", handler);
  }

  onConversationRead(callback: (data: { conversationId: string }) => void) {
    if (!this.socket) return;
    const handler = (data: { conversationId: string }) => {
      console.log("Conversation read:", data);
      callback(data);
    };
    this.socket.on("conversation-read", handler);
    return () => this.socket?.off("conversation-read", handler);
  }

  onUserTyping(callback: (data: { userId: string; typing: boolean }) => void) {
    if (!this.socket) return;
    const handler = (data: { userId: string; typing: boolean }) => {
      // console.log("User typing status:", data); // Can be noisy, uncomment if needed
      callback(data);
    };
    this.socket.on("user-typing", handler);
    return () => this.socket?.off("user-typing", handler);
  }

  onExplorePostsUpdate(callback: (data: { userId: string }) => void) {
    if (!this.socket) return;
    const handler = (data: { userId: string }) => {
      console.log("Explore posts updated for user:", data);
      callback(data);
    };
    this.socket.on("explore-posts-update", handler);
    return () => this.socket?.off("explore-posts-update", handler);
  }

  // --- Other Methods ---

  emitExplorePostsUpdate(userId: string) {
    if (!this.socket?.connected) {
      console.error("Cannot emit explore posts update: Socket not connected");
      return;
    }
    console.log("Emitting explore posts update for user:", userId);
    this.socket.emit("explore-posts-update", userId);
  }

  // Removed removeAllListeners method

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  removeEventListener(event: string, handler: (...args: any[]) => void) {
    // Generic way to remove a specific listener if needed, though the
    // cleanup functions returned by on... methods are preferred.
    if (this.socket) {
      console.log(`Removing listener for event: ${event}`);
      this.socket.off(event, handler);
    }
  }

  onConnect(callback: () => void) {
    // Allows attaching logic specifically to the 'connect' event
    this.socket?.on("connect", callback);
    return () => this.socket?.off("connect", callback);
  }

  // Removed sendMessageDelivered method
  // Removed sendMessageRead method
  // Removed updateMessageStatus method
}

export const socketService = SocketService.getInstance();
