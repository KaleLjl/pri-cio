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
   * Message Handling
   */
  handleNewMessage: async (message: ChatMessage): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.handleNewMessage(message);
  },

  handleOptimisticMessage: async (message: ChatMessage): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.handleOptimisticMessage(message);
  },

  updateMessageStatus: async (
    messageId: string,
    status: string,
    newMessage?: ChatMessage
  ): Promise<void> => {
    if (!chatCacheService.client) throw new Error('Cache service not initialized');
    return chatCacheService.client.updateMessageStatus(messageId, status, newMessage);
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
}; 