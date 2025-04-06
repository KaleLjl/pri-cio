// components/useChatHistory.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useContext } from "react";
import { ChatRecord } from "@/lib/types/chat";
import { SocketContext } from "@/lib/context/SocketContext";

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
  const queryClient = useQueryClient();
  const socket = useContext(SocketContext);

  // Fetch ChatHistory
  const {
    data: chats = [],
    isLoading: loading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ["chat-history"],
    queryFn: async () => {
      const response = await fetch("/api/chat/conversations/list");
      if (!response.ok) {
        throw new Error("Failed to fetch chat history");
      }
      return response.json();
    },
    enabled: !!session,
    // Add options to make fetching less aggressive
    staleTime: 60 * 1000, // Consider data fresh for 60 seconds (Increased from 30)
    refetchOnWindowFocus: false, // Don't refetch just because the window gained focus
    // refetchOnMount: false, // Keep default (true) for now, rely on staleTime
  });

  const refetch = async () => {
    await queryRefetch();
  };

  // Delete Message
  const deleteMessages = async (conversationId: string) => {
    try {
      const response = await fetch("/api/chat/messages", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete messages");
      }

      socket.leaveRoom(conversationId);

      queryClient.removeQueries({
        queryKey: ["chat-messages", conversationId],
      });
      await refetch();
    } catch (error) {
      console.error("Error deleting messages:", error);
      throw error;
    }
  };

  // 修改标记已读方法
  const markAsRead = async (conversationId: string, messageId?: string) => {
    try {
      // 1. (Removed) Redundant optimistic cache update removed.
      // Relying on ChatCacheManager triggered by socket events or markMessageRead.

      // 2. 通过 Socket Context 发送消息已读状态 (if messageId provided)
      if (messageId) {
        // Replace incorrect call with the correct one from SocketContext
        socket.markMessageRead({ messageId, conversationId });
      }

      // 3. 通过 HTTP API 更新服务器 - 使用 PATCH 方法
      const response = await fetch("/api/chat/messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark messages as read");
      }

      // 4. (Removed) No longer automatically refetching the list here.
      // The optimistic update and socket events should handle UI updates.
      // await refetch();
    } catch (error) {
      console.error("Error marking messages as read:", error);
      // Consider if a refetch is truly needed on error, or rely on cache invalidation elsewhere.
      // For now, removing the automatic refetch on error as well to break the loop.
      // await refetch();
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
