import { QueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { ChatMessage } from "../socket/types";
import { messageApiService } from '@/lib/services/api/chat/messageApiService';
import { 
  ChatRecord,
  ChatCacheClientInterface, 
  CacheKeys, 
  InfiniteMessagesData,
  MessagesResponse,
  HistoryMessageResult
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
  private messageUpdateQueue: Map<string, ChatMessage>;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.messageUpdateQueue = new Map();
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
   * Handle a new message with immediate UI update
   */
  async handleNewMessage(message: ChatMessage): Promise<void> {
    try {
      // Immediately update UI
      this.updateMessagesCache(message);
      
      // Queue the message for verification
      this.messageUpdateQueue.set(message._id, message);
      
      // Update chat history in background
      this.updateChatHistoryCache(message).catch(error => {
        console.error("Error updating chat history:", error);
      });
      
      // Immediately invalidate the conversation query to trigger a refetch
      this.queryClient.invalidateQueries({ 
        queryKey: [CacheKeys.CONVERSATION_MESSAGES, message.conversationId],
        exact: true
      });
      
      // Verify message in background
      this.verifyAndUpdateMessage(message).catch(error => {
        console.error("Error verifying message:", error);
        this.revertMessageUpdate(message);
      });
    } catch (error) {
      console.error("Error handling new message:", error);
      this.revertMessageUpdate(message);
    }
  }

  /**
   * Verify message with server and update if needed
   */
  private async verifyAndUpdateMessage(message: ChatMessage): Promise<void> {
    try {
      // Here you would typically verify the message with your server
      // For now, we'll just simulate a verification delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Remove from queue after verification
      this.messageUpdateQueue.delete(message._id);
    } catch (error) {
      console.error("Error verifying message:", error);
      throw error;
    }
  }

  /**
   * Revert a message update in case of error
   */
  private revertMessageUpdate(message: ChatMessage): void {
    try {
      const conversationKey = [CacheKeys.CONVERSATION_MESSAGES, message.conversationId];
      const existingData = this.queryClient.getQueryData<InfiniteMessagesData>(conversationKey);

      if (!existingData) return;

      // Remove the message from cache
      const updatedPages = existingData.pages.map(page => ({
        ...page,
        messages: page.messages.filter((m: ChatMessage) => m._id !== message._id)
      }));

      this.queryClient.setQueryData(conversationKey, {
        ...existingData,
        pages: updatedPages
      });

      // Remove from queue
      this.messageUpdateQueue.delete(message._id);
    } catch (error) {
      console.error("Error reverting message update:", error);
    }
  }

  /**
   * Update the messages cache for a specific conversation
   */
  private updateMessagesCache(message: ChatMessage): void {
    const conversationKey = [CacheKeys.CONVERSATION_MESSAGES, message.conversationId];
    const existingData = this.queryClient.getQueryData<InfiniteMessagesData>(conversationKey);

    if (!existingData) {
      // Initialize cache with new message
      const newData: InfiniteMessagesData = {
        pages: [
          {
            messages: [message],
            nextCursor: undefined
          }
        ],
        pageParams: [undefined]
      };
      
      this.queryClient.setQueryData(conversationKey, newData);
      return;
    }

    // Check for existing message
    const messageExists = existingData.pages.some(page => 
      page.messages.some((m: ChatMessage) => m._id === message._id)
    );

    if (messageExists) {
      // Update existing message
      const updatedPages = existingData.pages.map(page => ({
        ...page,
        messages: page.messages.map((m: ChatMessage) =>
          m._id === message._id ? { ...m, ...message } : m
        )
      }));

      this.queryClient.setQueryData(conversationKey, {
        ...existingData,
        pages: updatedPages
      });
    } else {
      // Add new message to first page
      const updatedData = {
        ...existingData,
        pages: [
          {
            ...existingData.pages[0],
            messages: [message, ...existingData.pages[0].messages]
          },
          ...existingData.pages.slice(1)
        ]
      };

      this.queryClient.setQueryData(conversationKey, updatedData);
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

  private getBaseQueryConfig() {
    return {
      staleTime: 0, // Consider data always stale
      gcTime: 1000 * 60 * 5, // Cache for 5 minutes
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    };
  }

  // Message related query configurations
  getMessagesQuery(conversationId: string) {
    return {
      queryKey: [CacheKeys.CONVERSATION_MESSAGES, conversationId],
      initialPageParam: undefined,
      getNextPageParam: (lastPage: MessagesResponse) => {
        if (!lastPage.hasMore) return undefined;
        const lastMessage = lastPage.messages[lastPage.messages.length - 1];
        return lastMessage?._id;
      },
      ...this.getBaseQueryConfig(),
      refetchInterval: 1000, // Poll every second for updates
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
      queryKey: ['current-user'],
      ...this.getBaseQueryConfig(),
      // Current user data doesn't need frequent polling
      refetchInterval: 1000 * 60, // Poll every minute
    };
  }

  getUserByIdQuery(userId: string) {
    return {
      queryKey: ['user', userId],
      ...this.getBaseQueryConfig(),
      // User data doesn't need frequent polling
      refetchInterval: 1000 * 60, // Poll every minute
    };
  }

  // Posts related query configurations
  getUserPostsQuery(userId: string) {
    return {
      queryKey: ['explore-posts', userId],
      ...this.getBaseQueryConfig(),
      // Posts don't need very frequent updates
      refetchInterval: 1000 * 30, // Poll every 30 seconds
    };
  }

  // Typing status query configurations
  getTypingStatusQuery(userId: string) {
    return {
      queryKey: ['chat-typing-status', userId],
      ...this.getBaseQueryConfig(),
      // Typing status needs frequent updates
      refetchInterval: 500, // Poll every 500ms
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

  /**
   * Get historical messages for a conversation with pagination support
   * Returns an infinite query for messages with proper configuration
   */
  handleGetHistoryMessage(conversationId: string, enabled: boolean): HistoryMessageResult {
    const {
      data: messagesData,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading: isLoadingMessages,
      error: messagesError,
    } = useInfiniteQuery({
      ...this.getMessagesQuery(conversationId),
      queryFn: ({ pageParam }) => messageApiService.getMessages(conversationId, pageParam),
      enabled: enabled && !!conversationId,
      refetchInterval: 1000, // Enable polling every second for real-time updates
      select: (data) => ({
        pages: data.pages,
        pageParams: data.pageParams,
      }),
    });

    const messages = this.processMessages(messagesData);

    return {
      messages,
      hasNextPage: !!hasNextPage,
      isFetchingNextPage,
      isLoadingMessages,
      messagesError: messagesError?.message || null,
      fetchNextPage,
    };
  }

  /**
   * Process messages to ensure uniqueness and correct ordering
   */
  private processMessages(messagesData: any): ChatMessage[] {
    const messages = messagesData?.pages.flatMap((page: MessagesResponse) => page.messages) ?? [];
    const uniqueMessages = new Map<string, ChatMessage>();
    
    messages.forEach((msg: ChatMessage) => {
      if (!uniqueMessages.has(msg._id)) {
        uniqueMessages.set(msg._id, msg);
      }
    });
    
    return Array.from(uniqueMessages.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
} 