import { ChatMessage } from "../socket/types";

/**
 * Cache service interface for chat data
 */
export interface ChatCacheClientInterface {
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
  USER_PROFILE = "user-profile"
}

export interface ChatRecord {
  _id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
  updatedAt: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface InfiniteMessagesData {
  pages: {
    messages: ChatMessage[];
    nextCursor?: string;
  }[];
  pageParams: any[];
}

export interface HistoryMessageResult {
  messages: ChatMessage[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoadingMessages: boolean;
  messagesError: string | null;
  fetchNextPage: () => Promise<any>;
} 