import { socketClient } from './socketClient';
import { 
  ChatMessage, 
  SocketEvent, 
  NewConversationData, 
  TypingData, 
  ConversationReadData 
} from './types';

/**
 * SocketEvents
 * 
 * Provides typed event handlers for socket events.
 * Acts as a facade over the raw socketClient to provide
 * better typing and domain-specific event handling.
 */
export class SocketEvents {
  /**
   * Listen for new messages
   */
  static onNewMessage(callback: (message: ChatMessage) => void) {
    return socketClient.on(SocketEvent.NEW_MESSAGE, callback);
  }

  /**
   * Listen for message delivered events
   */
  static onMessageDelivered(callback: (messageId: string) => void) {
    return socketClient.on(SocketEvent.MESSAGE_DELIVERED, callback);
  }

  /**
   * Listen for message read events
   */
  static onMessageRead(callback: (messageId: string) => void) {
    return socketClient.on(SocketEvent.MESSAGE_READ, callback);
  }

  /**
   * Listen for new conversations
   */
  static onNewConversation(callback: (data: NewConversationData) => void) {
    return socketClient.on(SocketEvent.NEW_CONVERSATION, callback);
  }

  /**
   * Listen for conversation read events
   */
  static onConversationRead(callback: (data: ConversationReadData) => void) {
    return socketClient.on(SocketEvent.CONVERSATION_READ, callback);
  }

  /**
   * Listen for typing status updates
   */
  static onUserTyping(callback: (data: TypingData) => void) {
    return socketClient.on(SocketEvent.TYPING, callback);
  }

  /**
   * Listen for explore posts updates
   */
  static onExplorePostsUpdate(callback: (data: { userId: string }) => void) {
    return socketClient.on(SocketEvent.EXPLORE_POSTS_UPDATE, callback);
  }

  /**
   * Listen for socket connection
   */
  static onConnect(callback: () => void) {
    return socketClient.on(SocketEvent.CONNECT, callback);
  }

  /**
   * Listen for socket disconnection
   */
  static onDisconnect(callback: (reason: string) => void) {
    return socketClient.on(SocketEvent.DISCONNECT, callback);
  }

  /**
   * Send a message
   */
  static sendMessage(message: ChatMessage): boolean {
    return socketClient.sendMessage(message);
  }

  /**
   * Send typing status
   */
  static sendTyping(data: { conversationId: string; userId: string; typing: boolean }): boolean {
    return socketClient.sendTyping(data);
  }

  /**
   * Send message delivered confirmation
   */
  static sendMessageDelivered(messageId: string): boolean {
    return socketClient.sendMessageDelivered(messageId);
  }

  /**
   * Send message read confirmation
   */
  static sendMessageRead(messageId: string): boolean {
    return socketClient.sendMessageRead(messageId);
  }

  /**
   * Emit explore posts update
   */
  static emitExplorePostsUpdate(userId: string): boolean {
    if (!socketClient.isConnected()) return false;
    
    socketClient.emit(SocketEvent.EXPLORE_POSTS_UPDATE, { userId });
    return true;
  }
} 