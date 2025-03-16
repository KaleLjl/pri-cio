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
      
  
      queryClient.removeQueries({ queryKey: ["chat-messages", conversationId] });
      await refetch();
    } catch (error) {
      console.error("Error deleting messages:", error);
      throw error;
    }
  };

  // 修改标记已读方法
  const markAsRead = async (conversationId: string, messageId?: string) => {
    try {
      // 1. 立即更新本地缓存以提供即时反馈
      queryClient.setQueryData<ChatRecord[]>(["chat-history"], (oldChats) => {
        if (!oldChats) return oldChats;
        return oldChats.map(chat => 
          chat._id === conversationId 
            ? { ...chat, unreadCount: 0 }
            : chat
        );
      });

      // 2. 通过 Socket Context 发送消息已读状态
      if (messageId) {
        socket.sendMessageRead(messageId);
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

      // 4. 重新获取聊天列表以确保同步
      await refetch();
    } catch (error) {
      console.error("Error marking messages as read:", error);
      // 如果失败，回滚本地缓存
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