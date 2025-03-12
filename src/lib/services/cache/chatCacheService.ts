import { ChatCacheClient } from '@/lib/utils/cache/chatCacheClient';
import { ChatMessage } from '@/lib/utils/socket/types';
import { QueryClient } from '@tanstack/react-query';

/**
 * Chat Cache Service
 * 
 * A wrapper around ChatCacheClient that provides a clean API interface
 * for cache operations. This follows the same pattern as other API services
 * in the application.
 */
export const chatCacheService = {
  client: null as ChatCacheClient | null,

  /**
   * Initialize the cache service with a QueryClient
   */
  initialize: (queryClient: QueryClient): void => {
    chatCacheService.client = new ChatCacheClient(queryClient);
  },

  /**
   * Get messages query configuration
   */
  getMessagesQuery: (conversationId: string) => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.getMessagesQuery(conversationId);
  },

  /**
   * Get current user query configuration
   */
  getCurrentUserQuery: () => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.getCurrentUserQuery();
  },

  /**
   * Get user by ID query configuration
   */
  getUserByIdQuery: (userId: string) => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.getUserByIdQuery(userId);
  },

  /**
   * Get user posts query configuration
   */
  getUserPostsQuery: (userId: string) => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.getUserPostsQuery(userId);
  },

  /**
   * Get typing status query configuration
   */
  getTypingStatusQuery: (userId: string) => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.getTypingStatusQuery(userId);
  },

  /**
   * Message Fetching
   */
  getMessages: (conversationId: string) => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    const client = chatCacheService.client;
    return client.getMessages(conversationId);
  },

  /**
   * Message Handling
   */
  handleNewMessage: async (message: ChatMessage): Promise<void> => {
    if (!chatCacheService.client) {
      console.error('[ChatService] Cannot handle new message: Cache service not initialized');
      throw new Error('Cache service not initialized');
    }
    
    if (!message || !message._id || !message.conversationId) {
      console.error('[ChatService] Invalid message received:', message);
      throw new Error('Invalid message format');
    }
    
    console.log('[ChatService] Processing new message:', {
      messageId: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      timestamp: new Date().toISOString()
    });
    
    try {
      // First update the messages cache
      await chatCacheService.client.handleNewMessage(message);
      
      // Then ensure the conversation exists in the chat history
      await chatCacheService.client.handleNewConversation(message.conversationId);
      
      console.log('[ChatService] Successfully processed new message:', message._id);
    } catch (error) {
      console.error('[ChatService] Error handling new message:', error);
      throw error;
    }
  },

  handleOptimisticMessage: async (message: ChatMessage): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.handleOptimisticMessage(message);
  },

  /**
   * Message Status Handling
   */
  updateMessageStatus: async (
    messageId: string,
    status: string,
    newMessage?: ChatMessage
  ): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.updateMessageStatus(messageId, status, newMessage);
  },

  handleMessageStatusSequence: async (messageId: string, statuses: string[]): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.handleMessageStatusSequence(messageId, statuses);
  },

  /**
   * Conversation Handling
   */
  handleNewConversation: async (conversationId: string): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.handleNewConversation(conversationId);
  },

  markConversationAsRead: async (conversationId: string): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.markConversationAsRead(conversationId);
  },

  /**
   * Typing Status
   */
  updateTypingStatus: async (userId: string, typing: boolean): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.updateTypingStatus(userId, typing);
  },

  /**
   * Utility Methods
   */
  isNewConversation: async (conversationId: string): Promise<boolean> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.isNewConversation(conversationId);
  },

  /**
   * Prefetch Methods
   */
  prefetchMessages: async (conversationId: string): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.prefetchMessages(conversationId);
  },

  /**
   * Message Cache Operations
   */
  clearConversationMessages: async (conversationId: string): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.clearConversationMessages(conversationId);
  },

  handleMessageSubmission: async (message: ChatMessage): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.handleMessageSubmission(message);
  },

  handleMessageSendSuccess: async (optimisticMessage: ChatMessage, sentMessage: ChatMessage): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.handleMessageSendSuccess(optimisticMessage, sentMessage);
  },

  handleMessageSendFailure: async (messageId: string): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.handleMessageSendFailure(messageId);
  },
}; 