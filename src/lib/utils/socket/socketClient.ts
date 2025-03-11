import { io, Socket } from "socket.io-client";
import { ChatMessage, SocketEvent } from "./types";

/**
 * SocketClient
 * 
 * Core socket.io connection management service.
 * Handles socket connections, reconnection logic, and raw event handling.
 * This is a singleton service to ensure only one socket connection exists.
 */
export class SocketClient {
  private static instance: SocketClient;
  private socket: Socket | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers = new Map<string, Set<(...args: any[]) => void>>();
  private activeRooms = new Set<string>();
  private autoReconnectEnabled = true;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of SocketClient
   */
  static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  /**
   * Connect to the socket server
   * @param userId User ID for authentication
   */
  connect(userId: string) {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    this.userId = userId;
    
    // Create socket connection
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      transports: ["websocket"],
      auth: { userId },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupSocketListeners();
    
    console.log("Socket connecting...");
  }

  /**
   * Set up basic socket listeners for connection events
   */
  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on(SocketEvent.CONNECT, () => {
      console.log("Socket connected");
      this.reconnectAttempts = 0;
      
      // Rejoin all active rooms after reconnect
      if (this.activeRooms.size > 0) {
        this.activeRooms.forEach((roomId) => {
          this.joinRoom(roomId);
        });
      }
      
      // Re-attach any existing event handlers
      this.reattachEventHandlers();
    });

    this.socket.on(SocketEvent.DISCONNECT, (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      this.handleDisconnection(reason);
    });

    this.socket.on(SocketEvent.CONNECT_ERROR, (error) => {
      console.error("Socket connection error:", error);
    });

    this.socket.on(SocketEvent.RECONNECT_ATTEMPT, (attempt) => {
      console.log(`Socket reconnection attempt: ${attempt}`);
      this.reconnectAttempts = attempt;
    });

    this.socket.on(SocketEvent.RECONNECT_ERROR, (error) => {
      console.error("Socket reconnection error:", error);
    });
  }

  /**
   * Handle socket disconnection and potentially reconnect
   */
  private handleDisconnection(reason: string) {
    // If disconnected intentionally, don't reconnect
    if (reason === "io client disconnect" || !this.autoReconnectEnabled) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      
      // Clear any existing timer
      this.clearReconnectTimer();
      
      // Set new timer for reconnection
      this.reconnectTimer = setTimeout(() => {
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        if (this.userId) {
          this.connect(this.userId);
        }
      }, delay);
    }
  }

  /**
   * Clear reconnection timer if set
   */
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Re-attach event handlers after reconnection
   */
  private reattachEventHandlers() {
    if (!this.socket) return;
    
    // Re-register all event handlers
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket?.off(event).on(event, handler);
      });
    });
  }

  /**
   * Register an event handler internally to track and reattach on reconnect
   */
  private addEventHandler(event: string, handler: (...args: any[]) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Disconnect from the socket server
   */
  disconnect() {
    this.autoReconnectEnabled = false;
    this.clearReconnectTimer();
    
    // Leave all active rooms
    if (this.socket?.connected && this.activeRooms.size > 0) {
      this.activeRooms.forEach((roomId) => {
        this.leaveRoom(roomId);
      });
      this.activeRooms.clear();
    }
    
    // Clear event handlers except core connection events
    this.eventHandlers.clear();
    
    this.socket?.disconnect();
    this.socket = null;
    this.userId = null;
    this.reconnectAttempts = 0;
    
    console.log("Socket disconnected");
  }

  /**
   * Join a socket room
   */
  joinRoom(roomId: string) {
    if (!this.socket?.connected) {
      console.warn("Cannot join room: Socket not connected");
      // Remember room to join on connection
      this.activeRooms.add(roomId);
      return;
    }
    
    if (!this.activeRooms.has(roomId)) {
      this.socket.emit(SocketEvent.JOIN_ROOM, { roomId });
      this.activeRooms.add(roomId);
      console.log(`Joined room: ${roomId}`);
    }
  }

  /**
   * Leave a socket room
   */
  leaveRoom(roomId: string) {
    if (!this.socket?.connected) {
      console.warn("Cannot leave room: Socket not connected");
      this.activeRooms.delete(roomId); // Remove from tracking anyway
      return;
    }
    
    if (this.activeRooms.has(roomId)) {
      this.socket.emit(SocketEvent.LEAVE_ROOM, { roomId });
      this.activeRooms.delete(roomId);
      console.log(`Left room: ${roomId}`);
    }
  }

  /**
   * Send a message via socket
   */
  sendMessage(message: ChatMessage) {
    if (!this.socket?.connected) {
      console.error("Cannot send message: Socket not connected");
      return false;
    }
    
    this.socket.emit(SocketEvent.SEND_MESSAGE, message);
    return true;
  }

  /**
   * Send typing status via socket
   */
  sendTyping(data: { conversationId: string; userId: string; typing: boolean }) {
    if (!this.socket?.connected) return false;
    
    this.socket.emit(SocketEvent.SEND_TYPING, data);
    return true;
  }

  /**
   * Send message delivered confirmation
   */
  sendMessageDelivered(messageId: string) {
    if (!this.socket?.connected) return false;
    
    this.socket.emit(SocketEvent.SEND_MESSAGE_DELIVERED, { messageId });
    return true;
  }

  /**
   * Send message read confirmation
   */
  sendMessageRead(messageId: string) {
    if (!this.socket?.connected) return false;
    
    this.socket.emit(SocketEvent.SEND_MESSAGE_READ, { messageId });
    return true;
  }

  /**
   * Register a listener for a socket event
   */
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) return () => {}; // Return no-op cleanup function
    
    this.socket.on(event, callback);
    this.addEventHandler(event, callback);
    
    // Return cleanup function
    return () => this.off(event, callback);
  }

  /**
   * Remove a socket event listener
   */
  off(event: string, callback?: (...args: any[]) => void) {
    if (!this.socket) return;
    
    if (callback) {
      // Remove specific callback
      this.socket.off(event, callback);
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /**
   * Get active room IDs
   */
  getActiveRooms(): string[] {
    return Array.from(this.activeRooms);
  }

  /**
   * Emit a socket event
   */
  emit(event: string, data: any): boolean {
    if (!this.socket?.connected) return false;
    this.socket.emit(event, data);
    return true;
  }
}

// Export singleton instance
export const socketClient = SocketClient.getInstance(); 