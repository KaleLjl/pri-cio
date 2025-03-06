import { SocketService } from '@/lib/utils/socket/socketService';
import { ChatMessage } from '../../utils/socket/types';

/**
 * Socket API Service
 * 
 * A wrapper around SocketService that provides a clean API interface
 * for socket operations. This follows the same pattern as other API services
 * in the application.
 */
export const socketApiService = {
  /**
   * Connection Management
   */
  connect: (userId: string): void => {
    const socketService = SocketService.getInstance();
    socketService.connect(userId);
  },

  disconnect: (): void => {
    const socketService = SocketService.getInstance();
    socketService.disconnect();
  },

  isConnected: (): boolean => {
    const socketService = SocketService.getInstance();
    return socketService.isConnected();
  },

  /**
   * Room Management
   */
  joinRoom: (roomId: string): void => {
    const socketService = SocketService.getInstance();
    socketService.joinRoom(roomId);
  },

  leaveRoom: (roomId: string): void => {
    const socketService = SocketService.getInstance();
    socketService.leaveRoom(roomId);
  },

  getActiveRooms: (): string[] => {
    const socketService = SocketService.getInstance();
    return socketService.getActiveRooms();
  },

  /**
   * Message Operations
   */
  sendMessage: (message: ChatMessage): boolean => {
    const socketService = SocketService.getInstance();
    return socketService.sendMessage(message);
  },

  sendTyping: (data: { conversationId: string; userId: string; typing: boolean }): boolean => {
    const socketService = SocketService.getInstance();
    return socketService.sendTyping(data);
  },

  /**
   * Message Status Operations
   */
  sendMessageDelivered: (messageId: string): boolean => {
    const socketService = SocketService.getInstance();
    return socketService.sendMessageDelivered(messageId);
  },

  sendMessageRead: (messageId: string): boolean => {
    const socketService = SocketService.getInstance();
    return socketService.sendMessageRead(messageId);
  },

  /**
   * Event Listeners
   */
  onNewMessage: (callback: (message: ChatMessage) => void): (() => void) => {
    const socketService = SocketService.getInstance();
    return socketService.onNewMessage(callback);
  },

  onMessageDelivered: (callback: (messageId: string) => void): (() => void) => {
    const socketService = SocketService.getInstance();
    return socketService.onMessageDelivered(callback);
  },

  onMessageRead: (callback: (messageId: string) => void): (() => void) => {
    const socketService = SocketService.getInstance();
    return socketService.onMessageRead(callback);
  },

  onNewConversation: (
    callback: (data: { conversationId: string; message: ChatMessage }) => void
  ): (() => void) => {
    const socketService = SocketService.getInstance();
    return socketService.onNewConversation(callback);
  },

  onConversationRead: (
    callback: (data: { conversationId: string }) => void
  ): (() => void) => {
    const socketService = SocketService.getInstance();
    return socketService.onConversationRead(callback);
  },

  onUserTyping: (
    callback: (data: { userId: string; typing: boolean }) => void
  ): (() => void) => {
    const socketService = SocketService.getInstance();
    return socketService.onUserTyping(callback);
  },

  /**
   * Connection Event Listeners
   */
  onConnect: (callback: () => void): (() => void) => {
    const socketService = SocketService.getInstance();
    return socketService.onConnect(callback);
  },

  onDisconnect: (callback: (reason: string) => void): (() => void) => {
    const socketService = SocketService.getInstance();
    return socketService.onDisconnect(callback);
  }
}; 