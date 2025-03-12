import { Socket } from 'socket.io-client';
import { ChatMessage, NewConversationData, ConversationReadData, TypingData } from '../../utils/socket/types';
import { SocketEvents } from '../../utils/socket/socketEvents';
import { SocketEvent } from '../../utils/socket/types';

/**
 * Socket API Service
 * 
 * A wrapper around socketClient and SocketEvents that provides a clean API interface
 * for socket operations. This follows the same pattern as other API services
 * in the application.
 */
export const socketService = {
  socket: null as Socket | null,
  typingTimeout: null as NodeJS.Timeout | null,
  activeRooms: new Set<string>(),

  /**
   * Initialize socket service
   */
  initialize(socket: Socket): void {
    socketService.socket = socket;
  },

  /**
   * Connection Management
   */
  connect: (userId: string): void => {
    socketService.socket?.connect();
  },

  disconnect: (): void => {
    socketService.socket?.disconnect();
  },

  isConnected: (): boolean => {
    return !!socketService.socket?.connected;
  },

  /**
   * Room Management
   */
  joinRoom: (conversationId: string): void => {
    socketService.socket?.emit(SocketEvent.JOIN_ROOM, { roomId: conversationId });
    socketService.activeRooms.add(conversationId);
  },

  leaveRoom: (conversationId: string): void => {
    socketService.socket?.emit(SocketEvent.LEAVE_ROOM, { roomId: conversationId });
    socketService.activeRooms.delete(conversationId);
  },

  getActiveRooms: (): string[] => {
    return Array.from(socketService.activeRooms);
  },

  /**
   * Message Operations
   */
  sendMessage: (message: ChatMessage): void => {
    socketService.socket?.emit(SocketEvent.SEND_MESSAGE, message);
  },

  /**
   * Typing Status Operations
   */
  handleTypingStatus: (data: TypingData): void => {
    if (socketService.typingTimeout) {
      clearTimeout(socketService.typingTimeout);
    }

    socketService.socket?.emit(SocketEvent.SEND_TYPING, data);

    if (data.typing) {
      socketService.typingTimeout = setTimeout(() => {
        socketService.socket?.emit(SocketEvent.SEND_TYPING, { ...data, typing: false });
      }, 3000);
    }
  },

  /**
   * Message Status Operations
   */
  sendMessageDelivered: (messageId: string): void => {
    socketService.socket?.emit(SocketEvent.SEND_MESSAGE_DELIVERED, { messageId });
  },

  sendMessageRead: (messageId: string): void => {
    socketService.socket?.emit(SocketEvent.SEND_MESSAGE_READ, { messageId });
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
  },

  /**
   * Cleanup
   */
  cleanup(): void {
    if (socketService.typingTimeout) {
      clearTimeout(socketService.typingTimeout);
    }
    socketService.socket?.disconnect();
    socketService.socket = null;
  }
}; 