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

  // Set up socket event listeners for real-time updates
  useEffect(() => {
    if (!session?.user?.id) return;

    console.log('Setting up message handler in useChatHistory');
    
    const handleNewMessage = (message: ChatMessage) => {
      console.log('Received new message in chat history:', message);
      
      // Update the chat history in cache
      queryClient.setQueryData<ChatRecord[]>(['chat-history'], (oldChats) => {
        if (!oldChats) return oldChats;

        return oldChats.map((chat) => {
          if (chat._id === message.conversationId) {
            return {
              ...chat,
              lastMessage: {
                _id: message._id,
                content: message.content,
                createdAt: message.createdAt,
                senderId: message.senderId
              },
              updatedAt: message.createdAt
            };
          }
          return chat;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.removeEventListener('new-message', handleNewMessage);
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
    staleTime: Infinity, // Don't refetch automatically
    enabled: !!session,
  });

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