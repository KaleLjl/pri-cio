import { socketClient } from './socketClient';
import { SocketEvents } from './socketEvents';
import { ChatMessage, SocketEvent, MessageStatus } from './types';

/**
 * SocketService
 * 
 * Focused service that handles socket-specific concerns.
 * No longer handles cache integration - that will be managed at the hook level.
 */
export class SocketService {
  private static instance: SocketService;
  private activeRooms = new Set<string>();

  private constructor() {}

  /**
   * Get the singleton instance of SocketService
   */
  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Connect to the socket server
   */
  connect(userId: string) {
    socketClient.connect(userId);
  }

  /**
   * Disconnect from the socket server
   */
  disconnect() {
    socketClient.disconnect();
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return socketClient.isConnected();
  }

  /**
   * Join a chat room
   */
  joinRoom(roomId: string) {
    this.activeRooms.add(roomId);
    socketClient.joinRoom(roomId);
  }

  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string) {
    this.activeRooms.delete(roomId);
    socketClient.leaveRoom(roomId);
  }

  /**
   * Send a message
   */
  sendMessage(message: ChatMessage) {
    return SocketEvents.sendMessage(message);
  }

  /**
   * Send typing status
   */
  sendTyping(data: { conversationId: string; userId: string; typing: boolean }) {
    return SocketEvents.sendTyping(data);
  }

  /**
   * Send message delivered confirmation
   */
  sendMessageDelivered(messageId: string) {
    return SocketEvents.sendMessageDelivered(messageId);
  }

  /**
   * Send message read confirmation
   */
  sendMessageRead(messageId: string) {
    return SocketEvents.sendMessageRead(messageId);
  }

  /**
   * Register event listeners for new messages
   */
  onNewMessage(callback: (message: ChatMessage) => void) {
    return SocketEvents.onNewMessage(callback);
  }

  /**
   * Register event listeners for message delivered events
   */
  onMessageDelivered(callback: (messageId: string) => void) {
    return SocketEvents.onMessageDelivered(callback);
  }

  /**
   * Register event listeners for message read events
   */
  onMessageRead(callback: (messageId: string) => void) {
    return SocketEvents.onMessageRead(callback);
  }

  /**
   * Register event listeners for new conversations
   */
  onNewConversation(callback: (data: { conversationId: string; message: ChatMessage }) => void) {
    return SocketEvents.onNewConversation(callback);
  }

  /**
   * Register event listeners for conversation read events
   */
  onConversationRead(callback: (data: { conversationId: string }) => void) {
    return SocketEvents.onConversationRead(callback);
  }

  /**
   * Register event listeners for typing status
   */
  onUserTyping(callback: (data: { userId: string; typing: boolean }) => void) {
    return SocketEvents.onUserTyping(callback);
  }

  /**
   * Register connect event listener
   */
  onConnect(callback: () => void) {
    return SocketEvents.onConnect(callback);
  }

  /**
   * Register disconnect event listener
   */
  onDisconnect(callback: (reason: string) => void) {
    return SocketEvents.onDisconnect(callback);
  }

  /**
   * Get active rooms
   */
  getActiveRooms(): string[] {
    return Array.from(this.activeRooms);
  }
} 