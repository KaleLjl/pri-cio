import { QueryClient } from "@tanstack/react-query";
import { ChatMessage } from "../socket/types";
import { messageApiService } from '@/lib/services/api/chat/messageApiService';
import { 
  ChatRecord,
  ChatCacheClientInterface, 
  CacheKeys, 
  InfiniteMessagesData,
  MessagesResponse,
} from "./types";

/**
 * ChatCacheClient
 * 
 * Manages the chat-related data in the React Query cache.
 * Provides methods for updating messages, conversations,
 * and handling optimistic updates.
 */
export class ChatCacheClient implements ChatCacheClientInterface {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Check if a conversation is new (not in cache)
   */
  async isNewConversation(conversationId: string): Promise<boolean> {
    const chatHistory = this.queryClient.getQueryData<ChatRecord[]>(
      [CacheKeys.CHAT_HISTORY]
    );
    
    return !chatHistory || !chatHistory.some((chat) => chat._id === conversationId);
  }

  /**
   * Handle a new message
   * Updates both the messages cache and chat history
   */
  async handleNewMessage(message: ChatMessage): Promise<void> {
    try {
      await this.updateMessagesCache(message);
      await this.updateChatHistoryCache(message);
    } catch (error) {
      console.error("Error handling new message:", error);
    }
  }

  /**
   * Update the messages cache for a specific conversation
   */
  private async updateMessagesCache(message: ChatMessage): Promise<void> {
    const conversationKey = [CacheKeys.CONVERSATION_MESSAGES, message.conversationId];
    const existingData = this.queryClient.getQueryData<InfiniteMessagesData>(conversationKey);

    if (!existingData) {
      // No cached data yet, don't update
      return;
    }

    // Check if message already exists to avoid duplicates
    const messageExists = existingData.pages.some((page) =>
      page.messages.some((m: ChatMessage) => m._id === message._id)
    );

    if (messageExists) {
      // If message exists, update its status
      const updatedPages = existingData.pages.map((page) => ({
        ...page,
        messages: page.messages.map((m: ChatMessage) =>
          m._id === message._id ? { ...m, ...message } : m
        ),
      }));

      this.queryClient.setQueryData(conversationKey, {
        ...existingData,
        pages: updatedPages,
      });
    } else {
      // Add new message to the first page
      // First, ensure we don't have any messages with the same ID (defensive check)
      const allMessages = existingData.pages.flatMap(page => page.messages);
      const hasDuplicate = allMessages.some((m: ChatMessage) => m._id === message._id);
      
      if (hasDuplicate) {
        console.warn(`Attempted to add duplicate message with ID ${message._id}`);
        // Update existing message instead of adding a new one
        const updatedPages = existingData.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m: ChatMessage) =>
            m._id === message._id ? { ...m, ...message } : m
          ),
        }));
        
        this.queryClient.setQueryData(conversationKey, {
          ...existingData,
          pages: updatedPages,
        });
      } else {
        // Add new message to the first page
        const updatedData = {
          ...existingData,
          pages: [
            {
              ...existingData.pages[0],
              messages: [message, ...existingData.pages[0].messages],
            },
            ...existingData.pages.slice(1),
          ],
        };

        this.queryClient.setQueryData(conversationKey, updatedData);
      }
    }
  }

  /**
   * Update the chat history cache with latest message
   */
  private async updateChatHistoryCache(message: ChatMessage): Promise<void> {
    const chatHistoryKey = [CacheKeys.CHAT_HISTORY];
    const chatHistory = this.queryClient.getQueryData<ChatRecord[]>(chatHistoryKey);

    if (!chatHistory) {
      // No cached chat history, don't update
      return;
    }

    // Find existing conversation
    const conversationIndex = chatHistory.findIndex(
      (chat) => chat._id === message.conversationId
    );

    if (conversationIndex === -1) {
      // New conversation, handle separately
      return;
    }

    // Update existing conversation with new message
    const updatedHistory = [...chatHistory];
    const conversation = { ...updatedHistory[conversationIndex] };

    // Update last message and unread count if needed
    conversation.lastMessage = message;
    
    // If message is from another user and not already read/delivered
    if (message.senderId !== "currentUser" && message.status !== "read" && message.status !== "delivered") {
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    }
    
    conversation.updatedAt = message.createdAt;
    
    // Remove from current position
    updatedHistory.splice(conversationIndex, 1);
    
    // Add to top of list
    updatedHistory.unshift(conversation);

    this.queryClient.setQueryData(chatHistoryKey, updatedHistory);
  }

  /**
   * Handle a new conversation
   * Fetches the conversation details and adds to cache
   */
  async handleNewConversation(conversationId: string): Promise<void> {
    try {
      // Check if conversation exists in cache
      const isNew = await this.isNewConversation(conversationId);
      
      if (!isNew) {
        // Already in cache, no need to fetch
        return;
      }

      // In a real implementation, you would:
      // 1. Fetch conversation details from API
      // 2. Update the cache with new conversation
      
      console.log(`Fetching new conversation: ${conversationId}`);
      
      // This is where you would call your API to get conversation details
      // const response = await fetchConversation(conversationId);
      
      // For now, we'll just log that we would fetch it
      // In the actual implementation, update the cache with the response
    } catch (error) {
      console.error("Error handling new conversation:", error);
    }
  }

  /**
   * Update message status
   * Note: This method updates the message status in both messages cache and chat history
   */
  async updateMessageStatus(messageId: string, status: string, newMessage?: ChatMessage): Promise<void> {
    try {
      // Find message in cache
      const allConversationQueries = this.queryClient.getQueriesData<InfiniteMessagesData>({
        queryKey: [CacheKeys.CONVERSATION_MESSAGES],
      });

      for (const [queryKey, data] of allConversationQueries) {
        if (!data) continue;

        let updated = false;
        let messageConversationId = "";

        // Update message in pages
        const updatedPages = data.pages.map((page) => {
          const updatedMessages = page.messages.map((message: ChatMessage) => {
            if (message._id === messageId) {
              messageConversationId = message.conversationId;
              updated = true;
              return { 
                ...message, 
                ...newMessage, 
                status 
              };
            }
            return message;
          });

          return {
            ...page,
            messages: updatedMessages,
          };
        });

        if (updated) {
          // Update messages cache
          this.queryClient.setQueryData(queryKey, {
            ...data,
            pages: updatedPages,
          });

          // Update last message in chat history if this is the last message
          if (messageConversationId) {
            await this.updateLastMessageStatusInChatHistory(messageConversationId, messageId, status);
          }
        }
      }
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  }

  /**
   * Handle sequential message status updates (e.g., delivered -> read)
   */
  async handleMessageStatusSequence(messageId: string, statuses: string[]): Promise<void> {
    try {
      for (const status of statuses) {
        await this.updateMessageStatus(messageId, status);
      }
    } catch (error) {
      console.error("Error handling message status sequence:", error);
    }
  }

  /**
   * Update last message status in chat history
   */
  private async updateLastMessageStatusInChatHistory(
    conversationId: string,
    messageId: string,
    status: string
  ): Promise<void> {
    const chatHistoryKey = [CacheKeys.CHAT_HISTORY];
    const chatHistory = this.queryClient.getQueryData<ChatRecord[]>(chatHistoryKey);

    if (!chatHistory) return;

    const updatedHistory = chatHistory.map((chat) => {
      if (chat._id === conversationId && chat.lastMessage?._id === messageId) {
        return {
          ...chat,
          lastMessage: {
            ...chat.lastMessage,
            status,
          },
        };
      }
      return chat;
    });

    this.queryClient.setQueryData(chatHistoryKey, updatedHistory);
  }

  /**
   * Mark a conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      // Update chat history
      const chatHistoryKey = [CacheKeys.CHAT_HISTORY];
      const chatHistory = this.queryClient.getQueryData<ChatRecord[]>(chatHistoryKey);

      if (!chatHistory) return;

      const updatedHistory = chatHistory.map((chat) => {
        if (chat._id === conversationId) {
          return {
            ...chat,
            unreadCount: 0,
            lastMessage: chat.lastMessage 
              ? { ...chat.lastMessage, status: "read" }
              : undefined,
          };
        }
        return chat;
      });

      this.queryClient.setQueryData(chatHistoryKey, updatedHistory);

      // Update all messages in this conversation to read
      const conversationKey = [CacheKeys.CONVERSATION_MESSAGES, conversationId];
      const conversationData = this.queryClient.getQueryData<InfiniteMessagesData>(conversationKey);

      if (!conversationData) return;

      const updatedPages = conversationData.pages.map((page) => ({
        ...page,
        messages: page.messages.map((message: ChatMessage) => ({
          ...message,
          status: message.status !== "sending" && message.status !== "error" ? "read" : message.status,
        })),
      }));

      this.queryClient.setQueryData(conversationKey, {
        ...conversationData,
        pages: updatedPages,
      });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  }

  /**
   * Update typing status
   * Note: This doesn't modify the cache but could trigger UI updates
   */
  async updateTypingStatus(userId: string, typing: boolean): Promise<void> {
    // In reality, this would probably use another state management solution
    // like a React context or Zustand store rather than the query cache
    // But we'll keep it here for consistency
    console.log(`User ${userId} is ${typing ? "typing" : "not typing"}`);
  }

  /**
   * Handle optimistic message updates
   * Adds a message to cache before it's confirmed by the server
   */
  async handleOptimisticMessage(message: ChatMessage): Promise<void> {
    try {
      // Immediately add to messages cache
      await this.updateMessagesCache(message);
      
      // Update chat history
      await this.updateChatHistoryCache(message);
    } catch (error) {
      console.error("Error handling optimistic message:", error);
    }
  }

  /**
   * Get messages query key for a conversation
   */
  getMessages(conversationId: string) {
    return {
      queryKey: [CacheKeys.CONVERSATION_MESSAGES, conversationId]
    };
  }

  // Message related query configurations
  getMessagesQuery(conversationId: string) {
    return {
      queryKey: [CacheKeys.CONVERSATION_MESSAGES, conversationId],
      initialPageParam: undefined,
      getNextPageParam: (lastPage: MessagesResponse) => {
        if (!lastPage.hasMore) return undefined;
        const firstMessage = lastPage.messages[0];
        return firstMessage?._id;
      }
    };
  }

  /**
   * Prefetch messages for a conversation
   */
  async prefetchMessages(conversationId: string): Promise<void> {
    if (!conversationId) return;
    
    await this.queryClient.prefetchInfiniteQuery({
      ...this.getMessagesQuery(conversationId),
      queryFn: () => messageApiService.getMessages(conversationId)
    });
  }

  // User related query configurations
  getCurrentUserQuery() {
    return {
      queryKey: ['current-user']
    };
  }

  getUserByIdQuery(userId: string) {
    return {
      queryKey: ['user', userId]
    };
  }

  // Posts related query configurations
  getUserPostsQuery(userId: string) {
    return {
      queryKey: ['explore-posts', userId]
    };
  }

  // Typing status query configurations
  getTypingStatusQuery(userId: string) {
    return {
      queryKey: ['chat-typing-status', userId],
      initialData: false
    };
  }

  /**
   * Message Cache Operations
   */

  /**
   * Clear conversation messages from cache
   */
  async clearConversationMessages(conversationId: string): Promise<void> {
    this.queryClient.removeQueries({ queryKey: [CacheKeys.CONVERSATION_MESSAGES, conversationId] });
  }

  /**
   * Handle message submission with optimistic update
   */
  async handleMessageSubmission(message: ChatMessage): Promise<void> {
    try {
      // Add message to cache optimistically
      await this.handleOptimisticMessage(message);
      
      // Update conversation in cache
      await this.handleNewConversation(message.conversationId);
      
    } catch (error) {
      console.error("Error handling message submission:", error);
      // Revert optimistic update if needed
      await this.updateMessageStatus(message._id, 'failed');
    }
  }

  /**
   * Update message and conversation status after successful send
   */
  async handleMessageSendSuccess(optimisticMessage: ChatMessage, sentMessage: ChatMessage): Promise<void> {
    try {
      await this.updateMessageStatus(optimisticMessage._id, 'sent', sentMessage);
      await this.updateChatHistoryCache(sentMessage);
    } catch (error) {
      console.error("Error handling message send success:", error);
    }
  }

  /**
   * Handle message send failure
   */
  async handleMessageSendFailure(messageId: string): Promise<void> {
    try {
      await this.updateMessageStatus(messageId, 'failed');
    } catch (error) {
      console.error("Error handling message send failure:", error);
    }
  }
} 