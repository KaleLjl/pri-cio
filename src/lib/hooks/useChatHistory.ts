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
}

export function useChatHistory(): UseChatHistoryReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const socket = useContext(SocketContext);

  // 获取聊天历史
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
  });

  // 包装 refetch 函数以返回 void
  const refetch = async () => {
    await queryRefetch();
  };

  // 删除消息
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

      // 离开房间
      socket.leaveRoom(conversationId);
      
      // 清除缓存
      queryClient.removeQueries({ queryKey: ["chat-messages", conversationId] });
      await refetch();
    } catch (error) {
      console.error("Error deleting messages:", error);
      throw error;
    }
  };

  return {
    chats,
    loading,
    error,
    refetch,
    deleteMessages,
  };
}