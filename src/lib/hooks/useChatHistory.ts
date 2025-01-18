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
  unreadCount: number;
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
      const response = await fetch("/api/chat/conversations");
      if (!response.ok) {
        throw new Error("Failed to fetch chat history");
      }
      const data = await response.json();
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
      queryClient.setQueryData<ChatRecord[]>(
        ["chat-history"],
        (oldChats = []) => {
          const updated = [...oldChats];
          const chatIndex = updated.findIndex((chat) => chat._id === message.conversationId);

          if (chatIndex !== -1) {
            updated[chatIndex] = {
              ...updated[chatIndex],
              lastMessage: {
                _id: message._id,
                content: message.content,
                createdAt: message.createdAt,
                senderId: message.senderId,
              },
              updatedAt: message.createdAt,
              unreadCount: message.senderId !== session?.user?.id 
                ? (updated[chatIndex].unreadCount || 0) + 1 
                : (updated[chatIndex].unreadCount || 0),
            };
          }

          return updated.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }
      );
    },
    [queryClient, session?.user?.id]
  );

  return {
    chats,
    loading,
    error: error as Error | null,
    refetch: async () => {
      await refetch();
    },
    updateChatHistory,
  };
}