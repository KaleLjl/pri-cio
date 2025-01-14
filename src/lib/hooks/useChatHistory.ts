import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

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
}

const CHAT_HISTORY_CACHE_TIME = 1000 * 60 * 30; // 30 minutes
const CHAT_HISTORY_STALE_TIME = 1000 * 60 * 5; // 5 minutes

export function useChatHistory(): UseChatHistoryReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const {
    data: chats = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['chat-history'],
    queryFn: async () => {
      const response = await fetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      const data = await response.json();
      return data as ChatRecord[];
    },
    staleTime: CHAT_HISTORY_STALE_TIME,
    gcTime: CHAT_HISTORY_CACHE_TIME,
    enabled: !!session,
    refetchOnWindowFocus: false
  });

  // Update chat history when receiving new message
  const updateChatHistory = (newMessage: any, conversationId: string) => {
    queryClient.setQueryData<ChatRecord[]>(['chat-history'], (oldChats) => {
      if (!oldChats) return oldChats;

      return oldChats.map(chat => {
        if (chat._id === conversationId) {
          return {
            ...chat,
            lastMessage: {
              _id: newMessage._id,
              content: newMessage.content,
              createdAt: newMessage.createdAt,
              senderId: newMessage.senderId
            },
            updatedAt: new Date().toISOString()
          };
        }
        return chat;
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  };

  return {
    chats,
    loading,
    error: error as Error | null,
    refetch: async () => {
      await refetch();
    }
  };
} 