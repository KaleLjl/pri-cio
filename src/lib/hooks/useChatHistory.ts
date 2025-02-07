// components/useChatHistory.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRef, useCallback } from "react";
import { ChatMessage, MessageContent } from "@/lib/types/chat";

interface ChatRecord {
  _id: string;
  participants: {
    _id: string;
    name: string;
    avatarUrl: string;
  }[];
  lastMessage?: {
    _id: string;
    content: MessageContent;
    createdAt: string;
    senderId: string;
  };
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
}

interface UseChatHistoryReturn {
  chats: ChatRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateChatHistory: (message: ChatMessage) => void;
  deleteMessages: (conversationId: string) => Promise<void>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const chatCacheRef = useRef<Map<string, ChatRecord>>(new Map());

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
      const data = await response.json();
      
      // 更新缓存
      const newChats = data as ChatRecord[];
      chatCacheRef.current = new Map(newChats.map((chat) => [chat._id, chat]));

      return newChats.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || a.updatedAt;
        const timeB = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    enabled: !!session,
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  // Update chat history with new message
  const updateChatHistory = useCallback((message: ChatMessage) => {
    queryClient.setQueryData<ChatRecord[]>(["chat-history"], (oldChats = []) => {
      const updatedChats = [...oldChats];
      const chatIndex = updatedChats.findIndex(
        (chat) => chat._id === message.conversationId
      );

      if (chatIndex > -1) {
        // 更新现有聊天
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: {
            _id: message._id,
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId,
          },
          updatedAt: message.createdAt,
          unreadCount: updatedChats[chatIndex].unreadCount + 1,
        };
      }

      // 按最新消息时间排序
      return updatedChats.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || a.updatedAt;
        const timeB = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
    });
  }, [queryClient]);

  // Delete messages for a conversation
  const deleteMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch("/api/chat/messages", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete messages");
      }

      // 更新本地缓存
      queryClient.setQueryData<ChatRecord[]>(["chat-history"], (oldChats = []) => {
        const updatedChats = oldChats.filter((chat) => chat._id !== conversationId);
        chatCacheRef.current = new Map(updatedChats.map(chat => [chat._id, chat]));
        return updatedChats;
      });
    } catch (error) {
      console.error("Error deleting messages:", error);
      throw error;
    }
  }, [queryClient]);

  return {
    chats,
    loading,
    error,
    refetch,
    updateChatHistory,
    deleteMessages,
  };
}