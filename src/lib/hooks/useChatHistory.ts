// components/useChatHistory.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useContext } from "react";
import { ChatRecord } from "@/lib/types/chat";
import { SocketContext } from "@/lib/context/SocketContext";
import { conversationApiService } from "@/lib/services/api/chat/conversationService";
import { messageApiService } from "@/lib/services/api/chat/messageService";

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

  // 获取聊天历史
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

  // 包装 refetch 函数以返回 void
  const refetch = async () => {
    await queryRefetch();
  };

  // 删除消息
  const deleteMessages = async (conversationId: string) => {
    try {
      await messageApiService.deleteMessages(conversationId);
      
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

      // 3. 通过 API 服务更新服务器
      await messageApiService.markAsRead(conversationId);

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