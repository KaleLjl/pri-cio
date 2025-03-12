// components/useChatHistory.ts
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ChatRecord } from "@/lib/types/chat";
import { socketService } from "@/lib/services/socket/socketService";
import { chatCacheService } from "@/lib/services/cache/chatCacheService";
import { conversationApiService } from "@/lib/services/api/chat/conversationService";
import { messageApiService } from "@/lib/services/api/chat/messageApiService";
import { useCallback } from "react";

interface UseChatHistoryReturn {
  chats: ChatRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  deleteMessages: (conversationId: string) => Promise<void>;
  markAsRead: (conversationId: string, messageId?: string) => Promise<void>;
  isSocketConnected: boolean;
}

export function useChatHistory(): UseChatHistoryReturn {
  const { data: session } = useSession();
  
  // Initialize cache service with the query client
  const {
    data: chats = [],
    isLoading: loading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ["chat-history"],
    queryFn: async () => {
      try {
        return await conversationApiService.getConversations();
      } catch (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }
    },
    enabled: !!session,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  });

  // Wrap refetch function to return void
  const refetch = async () => {
    try {
      await queryRefetch();
    } catch (error) {
      console.error("Error refetching chat history:", error);
    }
  };

  // Delete messages with enhanced error handling
  const deleteMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      throw new Error("Missing conversation ID");
    }

    try {
      // Step 1: Delete messages via API
      await messageApiService.deleteMessages(conversationId);
      
      // Step 2: Leave room via socket if connected
      if (socketService.isConnected()) {
        try {
          socketService.leaveRoom(conversationId);
        } catch (socketError) {
          console.error("Error leaving room:", socketError);
          // Continue with other operations even if socket operation fails
        }
      }
      
      // Step 3: Clear cache
      try {
        await chatCacheService.clearConversationMessages(conversationId);
      } catch (cacheError) {
        console.error("Error clearing cache:", cacheError);
        // Continue with refetch even if cache clear fails
      }
      
      // Step 4: Refetch chat history
      await refetch();
    } catch (error) {
      console.error("Error deleting messages:", error);
      throw new Error(
        error instanceof Error 
          ? `Failed to delete messages: ${error.message}`
          : "Failed to delete messages"
      );
    }
  }, [refetch]);

  // Mark messages as read with enhanced error handling
  const markAsRead = useCallback(async (conversationId: string, messageId?: string) => {
    if (!conversationId) {
      throw new Error("Missing conversation ID");
    }

    try {
      // Step 1: Update local cache optimistically
      try {
        await chatCacheService.markConversationAsRead(conversationId);
      } catch (cacheError) {
        console.error("Error updating cache:", cacheError);
        // Continue with other operations even if cache update fails
      }

      // Step 2: Send read status via socket if connected and messageId is provided
      if (messageId && socketService.isConnected()) {
        try {
          socketService.sendMessageRead(messageId);
        } catch (socketError) {
          console.error("Error sending read status via socket:", socketError);
          // Continue with API update even if socket operation fails
        }
      }

      // Step 3: Update server via API
      await messageApiService.markAsRead(conversationId);

      // Step 4: Refetch to ensure sync
      await refetch();
    } catch (error) {
      console.error("Error marking messages as read:", error);
      
      // Revert cache on error
      try {
        await refetch();
      } catch (refetchError) {
        console.error("Error reverting cache:", refetchError);
      }
      
      throw new Error(
        error instanceof Error 
          ? `Failed to mark messages as read: ${error.message}`
          : "Failed to mark messages as read"
      );
    }
  }, [refetch]);

  return {
    chats,
    loading,
    error,
    refetch,
    deleteMessages,
    markAsRead,
    isSocketConnected: socketService.isConnected(),
  };
}