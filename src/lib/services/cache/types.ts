import { InfiniteData } from "@tanstack/react-query";
import { 
  ChatMessage, 
  ChatRecord, 
  MessagesResponse 
} from "@/lib/services/socket/types";

/**
 * Cache service interface for chat data
 */
export interface ChatCacheServiceInterface {
  // Message handling
  handleNewMessage: (message: ChatMessage) => Promise<void>;
  handleOptimisticMessage: (message: ChatMessage) => Promise<void>;
  updateMessageStatus: (messageId: string, status: string, newMessage?: ChatMessage) => Promise<void>;
  
  // Conversation handling
  handleNewConversation: (conversationId: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  
  // Typing status
  updateTypingStatus: (userId: string, typing: boolean) => Promise<void>;
  
  // Utility methods
  isNewConversation: (conversationId: string) => Promise<boolean>;
}

/**
 * React Query cache key types
 */
export enum CacheKeys {
  CHAT_HISTORY = "chat-history",
  CONVERSATION_MESSAGES = "conversation-messages",
  USER_PROFILE = "user-profile",
}

/**
 * React Query message response type for infinite queries
 */
export type InfiniteMessagesData = InfiniteData<MessagesResponse>; 