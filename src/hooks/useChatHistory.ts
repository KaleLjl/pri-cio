// components/useChatHistory.ts
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ChatRecord } from "@/lib/types/chat";
import { socketService } from "@/lib/services/socket/socketService";
import { chatCacheService } from "@/lib/services/cache/chatCacheService";
import { conversationApiService } from "@/lib/services/api/chat/conversationService";
import { messageApiService } from "@/lib/services/api/chat/messageApiService";

interface UseChatHistoryReturn {
  chats: ChatRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  deleteMessages: (conversationId: string) => Promise<void>;
  markAsRead: (conversationId: string, messageId?: string) => Promise<void>;
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
      return conversationApiService.getConversations();
    },
    enabled: !!session,
  });

  // Wrap refetch function to return void
  const refetch = async () => {
    await queryRefetch();
  };

  // Delete messages
  const deleteMessages = async (conversationId: string) => {
    try {
      // Step 1: Delete messages via API
      await messageApiService.deleteMessages(conversationId);
      
      // Step 2: Leave room via socket
      socketService.leaveRoom(conversationId);
      
      // Step 3: Clear cache
      await chatCacheService.clearConversationMessages(conversationId);
      
      // Step 4: Refetch chat history
      await refetch();
    } catch (error) {
      console.error("Error deleting messages:", error);
      throw error;
    }
  };

  // Mark messages as read
  const markAsRead = async (conversationId: string, messageId?: string) => {
    try {
      // Step 1: Update local cache optimistically
      await chatCacheService.markConversationAsRead(conversationId);

      // Step 2: Send read status via socket if messageId is provided
      if (messageId) {
        socketService.sendMessageRead(messageId);
      }

      // Step 3: Update server via API
      await messageApiService.markAsRead(conversationId);

      // Step 4: Refetch to ensure sync
      await refetch();
    } catch (error) {
      console.error("Error marking messages as read:", error);
      // Revert cache on error
      await refetch();
      throw error;
    }
  };

  return {
    chats,
    loading,
    error,
    refetch,
    deleteMessages,
    markAsRead,
  };
}