import { ChatMessage, NewConversationData, ConversationReadData, TypingData } from '../../utils/socket/types';
import { socketClient } from '../../utils/socket/socketClient';
import { SocketEvents } from '../../utils/socket/socketEvents';

/**
 * Socket API Service
 * 
 * A wrapper around socketClient and SocketEvents that provides a clean API interface
 * for socket operations. This follows the same pattern as other API services
 * in the application.
 */
export const socketService = {
  /**
   * Connection Management
   */
  connect: (userId: string): void => {
    socketClient.connect(userId);
  },

  disconnect: (): void => {
    socketClient.disconnect();
  },

  isConnected: (): boolean => {
    return socketClient.isConnected();
  },

  /**
   * Room Management
   */
  joinRoom: (roomId: string): void => {
    socketClient.joinRoom(roomId);
  },

  leaveRoom: (roomId: string): void => {
    socketClient.leaveRoom(roomId);
  },

  getActiveRooms: (): string[] => {
    return socketClient.getActiveRooms();
  },

  /**
   * Message Operations
   */
  sendMessage: (message: ChatMessage): boolean => {
    return SocketEvents.sendMessage(message);
  },

  sendTyping: (data: { conversationId: string; userId: string; typing: boolean }): boolean => {
    return SocketEvents.sendTyping(data);
  },

  /**
   * Message Status Operations
   */
  sendMessageDelivered: (messageId: string): boolean => {
    return SocketEvents.sendMessageDelivered(messageId);
  },

  sendMessageRead: (messageId: string): boolean => {
    return SocketEvents.sendMessageRead(messageId);
  },

  /**
   * Event Listeners
   */
  onNewMessage: (callback: (message: ChatMessage) => void): (() => void) => {
    return SocketEvents.onNewMessage(callback);
  },

  onMessageDelivered: (callback: (messageId: string) => void): (() => void) => {
    return SocketEvents.onMessageDelivered(callback);
  },

  onMessageRead: (callback: (messageId: string) => void): (() => void) => {
    return SocketEvents.onMessageRead(callback);
  },

  onNewConversation: (
    callback: (data: NewConversationData) => void
  ): (() => void) => {
    return SocketEvents.onNewConversation(callback);
  },

  onConversationRead: (
    callback: (data: ConversationReadData) => void
  ): (() => void) => {
    return SocketEvents.onConversationRead(callback);
  },

  onUserTyping: (
    callback: (data: TypingData) => void
  ): (() => void) => {
    return SocketEvents.onUserTyping(callback);
  },

  /**
   * Connection Event Listeners
   */
  onConnect: (callback: () => void): (() => void) => {
    return SocketEvents.onConnect(callback);
  },

  onDisconnect: (callback: (reason: string) => void): (() => void) => {
    return SocketEvents.onDisconnect(callback);
  },

  /**
   * Explore Posts Operations
   */
  emitExplorePostsUpdate: (userId: string): boolean => {
    return SocketEvents.emitExplorePostsUpdate(userId);
  }
}; 