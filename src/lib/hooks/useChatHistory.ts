import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { socketService } from '@/lib/socket';
import { ChatMessage } from '@/lib/types/chat';

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

  // Message handler setup - independent of chats
  useEffect(() => {
    if (!session?.user?.id) return;

    console.log('Setting up message handler in useChatHistory, user ID:', session.user.id);
    
    const messageHandler = async (message: ChatMessage) => {
      console.log('Received new message in chat history:', message);
      console.log('Message details:', {
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt
      });

      // Immediately invalidate and refetch
      console.log('Invalidating and refetching chat history...');
      await queryClient.invalidateQueries({ queryKey: ['chat-history'] });
      
      // Double check if the data was updated
      const currentData = queryClient.getQueryData(['chat-history']);
      console.log('Current chat history data after invalidation:', currentData);
    };

    // Set up socket connection if not already connected
    if (!socketService.isConnected()) {
      console.log('Connecting socket in useChatHistory');
      socketService.connect(session.user.id);
    }

    socketService.onNewMessage(messageHandler);
    console.log('Message handler registered for user:', session?.user?.id);

    return () => {
      console.log('Cleaning up message handler for user:', session?.user?.id);
      socketService.removeEventListener('new-message', messageHandler);
    };
  }, [session?.user?.id, queryClient]);

  const {
    data: chats = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['chat-history'],
    queryFn: async () => {
      console.log('Fetching chat history from server...');
      const response = await fetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      const data = await response.json();
      console.log('Fetched chat history:', data.length, 'conversations');
      return data as ChatRecord[];
    },
    staleTime: 0, // Always fetch new data
    gcTime: 0,
    enabled: !!session,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // Poll every 3 seconds as a fallback
  });

  // Log whenever chats data changes
  useEffect(() => {
    console.log('Chat history data updated:', chats.length, 'conversations');
  }, [chats]);

  return {
    chats,
    loading,
    error: error as Error | null,
    refetch: async () => {
      console.log('Manual refetch triggered');
      await refetch();
    }
  };
} 