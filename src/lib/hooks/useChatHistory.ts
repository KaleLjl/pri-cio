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
    staleTime: 0,
    gcTime: 0,
    enabled: !!session,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  return {
    chats,
    loading,
    error: error as Error | null,
    refetch: async () => {
      await refetch();
    }
  };
} 