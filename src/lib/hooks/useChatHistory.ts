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

        let chatExists = false;
        const updatedChats = oldChats.map((chat) => {
          if (chat._id === message.conversationId) {
            chatExists = true;
            // Update the chat with the new message
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
        });

        // If this is a new conversation, we need to fetch the updated chat list
        if (!chatExists) {
          console.log('New conversation detected, triggering refetch');
          queryClient.invalidateQueries({ queryKey: ['chat-history'] });
          return oldChats;
        }

        // Sort chats by last message time, most recent first
        return updatedChats.sort((a, b) => {
          const timeA = a.lastMessage?.createdAt || a.updatedAt;
          const timeB = b.lastMessage?.createdAt || b.updatedAt;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });
      });
    };

    // Set up socket event listeners
    socketService.onNewMessage(handleNewMessage);

    // Only remove the message handler, don't disconnect or leave rooms
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
      console.log('Fetching initial chat history...');
      const response = await fetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      const data = await response.json();
      
      // Sort chats by last message time before returning
      const sortedChats = (data as ChatRecord[]).sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || a.updatedAt;
        const timeB = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      // Join all chat rooms after fetching
      if (socketService.isConnected()) {
        console.log('Joining all chat rooms after initial fetch');
        sortedChats.forEach(chat => {
          socketService.joinRoom(chat._id);
        });
      } else if (session?.user?.id) {
        // If socket is not connected, try to connect and then join rooms
        console.log('Socket not connected, attempting to connect...');
        socketService.connect(session.user.id);
        // Rooms will be joined automatically after connection due to activeRooms tracking
      }

      return sortedChats;
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