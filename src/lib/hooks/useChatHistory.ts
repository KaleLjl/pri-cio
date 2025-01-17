// components/useChatHistory.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRef, useCallback } from "react";
import { ChatMessage } from "@/lib/types/chat";

interface ChatRecord {
  _id: string;
  participants: {
    _id: string;
    name: string;
    avatarUrl: string;
  }[];
  lastMessage?: {
    _id: string;
    content: string;
    createdAt: string;
    senderId: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UseChatHistoryReturn {
  chats: ChatRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateChatHistory: (message: ChatMessage) => void;
}

export function useChatHistory(): UseChatHistoryReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const chatCacheRef = useRef<Map<string, ChatRecord>>(new Map());

  const {
    data: chats = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["chat-history"],
    queryFn: async () => {
      console.log("Fetching chat history...");
      const response = await fetch("/api/chat/conversations");
      if (!response.ok) {
        throw new Error("Failed to fetch chat history");
      }
      const data = await response.json();
      console.log("Fetched chat history:", data);

      chatCacheRef.current = new Map((data as ChatRecord[]).map((chat) => [chat._id, chat]));

      return Array.from(chatCacheRef.current.values()).sort((a, b) => {
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

  const updateChatHistory = useCallback(
    (message: ChatMessage) => {
      console.log("Updating chat history with message:", message);
      
      queryClient.setQueryData<ChatRecord[]>(
        ["chat-history"],
        (oldChats) => {
          if (!oldChats) return oldChats;

          const updated = [...oldChats];
          const chatIndex = updated.findIndex((chat) => chat._id === message.conversationId);

          if (chatIndex !== -1) {
            // 更新现有对话
            updated[chatIndex] = {
              ...updated[chatIndex],
              lastMessage: {
                _id: message._id,
                content: message.content,
                createdAt: message.createdAt,
                senderId: message.senderId,
              },
              updatedAt: message.createdAt,
            };
          } else {
            // 如果是新对话，可能需要从服务器获取完整的对话信息
            // 这里可以触发一个重新获取聊天历史的操作
            queryClient.invalidateQueries(["chat-history"]);
          }

          // 重新排序，最新消息在前
          return updated.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }
      );
    },
    [queryClient]
  );

  return {
    chats,
    loading,
    error: error as Error | null,
    refetch: async () => {
      console.log("Manual refetch triggered");
      await refetch();
    },
    updateChatHistory,
  };
}