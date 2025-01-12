import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { default as socketIOClient } from 'socket.io-client';
import { ChatMessage, ChatUser, MessageStatus } from '@/lib/types/chat';
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';

// Constants
const MESSAGES_PER_PAGE = 20;
const SOCKET_RECONNECT_DELAY = 1000;

interface UseChatProps {
  conversationId: string;
  currentUserId: string;
  otherUser: ChatUser;
}

interface ChatHookResult {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  inputMessage: string;
  isSending: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  setInputMessage: (value: string) => void;
  sendMessage: (content: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
}

interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextPage?: number;
}

export function useChat(props: UseChatProps | null): ChatHookResult {
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSending, setIsSending] = useState(false);

  // Handle typing status
  const handleTyping = useCallback((typing: boolean) => {
    if (!props?.conversationId || !props?.currentUserId) return;
    socketRef.current?.emit('typing', {
      conversationId: props.conversationId,
      userId: props.currentUserId,
      typing,
    });
  }, [props?.conversationId, props?.currentUserId]);

  // Update message status in cache
  const updateMessageStatus = useCallback((messageId: string, status: MessageStatus) => {
    queryClient.setQueryData<InfiniteData<MessagesResponse>>(['chat-messages', props?.conversationId], (old) => {
      if (!old) return old;

      return {
        ...old,
        pages: old.pages.map(page => ({
          ...page,
          messages: page.messages.map(msg => 
            msg._id === messageId ? { ...msg, status } : msg
          )
        }))
      };
    });
  }, [props?.conversationId, queryClient]);

  // Fetch messages with React Query's useInfiniteQuery
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['chat-messages', props?.conversationId] as const,
    queryFn: async ({ pageParam = 1 }) => {
      if (!props?.conversationId) throw new Error('No conversation ID');
      
      const response = await fetch(
        `/api/chat/messages?conversationId=${props.conversationId}&page=${pageParam}&limit=${MESSAGES_PER_PAGE}`,
        { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      return {
        messages: data.messages as ChatMessage[],
        hasMore: data.hasMore as boolean,
        nextPage: data.hasMore ? (pageParam as number) + 1 : undefined
      } as MessagesResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep cache for 30 minutes
    refetchOnWindowFocus: false,
    enabled: !!props?.conversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation<ChatMessage, Error, string>({
    mutationFn: async (content: string) => {
      if (!props?.conversationId) throw new Error('No conversation ID');
      setIsSending(true);
      
      try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: props.conversationId, content }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const newMessage = await response.json();
        return { ...newMessage, status: 'sending' } as ChatMessage;
      } finally {
        setIsSending(false);
      }
    },
    onSuccess: (newMessage) => {
      // Update cache with new message
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(['chat-messages', props?.conversationId], (old) => {
        if (!old) return { pages: [{ messages: [newMessage], hasMore: false }], pageParams: [1] };
        
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          const lastPage = newPages[newPages.length - 1];
          lastPage.messages = [...lastPage.messages, newMessage];
        }
        
        return { ...old, pages: newPages };
      });

      // Emit to socket and update status
      socketRef.current?.emit('send-message', newMessage);
      updateMessageStatus(newMessage._id, 'sent');
    },
    onError: (error, content) => {
      console.error('Failed to send message:', error);
      // Optionally update UI to show error state
    }
  });

  // Socket connection setup
  useEffect(() => {
    if (!props?.conversationId || !props?.currentUserId) return;

    const initSocket = async () => {
      try {
        const authResponse = await fetch('/api/users/me');
        if (!authResponse.ok) {
          throw new Error('Failed to authenticate');
        }
        const userData = await authResponse.json();
        
        const socket = socketIOClient(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
          path: '/api/socket',
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: SOCKET_RECONNECT_DELAY,
          transports: ['websocket'],
          query: { userId: userData._id }
        });

        socket.on('connect', () => {
          console.log('Connected to socket server');
          socket.emit('join-room', props.conversationId);
        });

        socket.on('new-message', (message: ChatMessage) => {
          // Only add message if it's not from the current user
          if (message.senderId !== props.currentUserId) {
            queryClient.setQueryData<InfiniteData<MessagesResponse>>(['chat-messages', props.conversationId], (old) => {
              if (!old) return { pages: [{ messages: [message], hasMore: false }], pageParams: [1] };
              
              // Check if message already exists
              const messageExists = old.pages.some(page => 
                page.messages.some(m => m._id === message._id)
              );
              
              if (messageExists) return old;
              
              const newPages = [...old.pages];
              if (newPages.length > 0) {
                const lastPage = newPages[newPages.length - 1];
                lastPage.messages = [...lastPage.messages, message];
              }
              
              return { ...old, pages: newPages };
            });
          }
        });

        socket.on('message-delivered', (messageId: string) => {
          updateMessageStatus(messageId, 'delivered');
        });

        socket.on('message-read', (messageId: string) => {
          updateMessageStatus(messageId, 'read');
        });

        socket.on('user-typing', (data: { userId: string; typing: boolean }) => {
          if (data.userId === props.otherUser._id) {
            setIsTyping(data.typing);
          }
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('Socket initialization error:', error);
        setTimeout(initSocket, SOCKET_RECONNECT_DELAY);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-room', props.conversationId);
        socketRef.current.disconnect();
      }
    };
  }, [props?.conversationId, props?.currentUserId, props?.otherUser?._id, queryClient, updateMessageStatus]);

  // Handle typing status
  useEffect(() => {
    if (!inputMessage) {
      handleTyping(false);
      return;
    }

    handleTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => handleTyping(false), 2000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [inputMessage, handleTyping]);

  // Combine all messages from all pages and sort them
  const allMessages = data?.pages.flatMap(page => page.messages) ?? [];
  const uniqueMessages = Array.from(
    new Map(allMessages.map(message => [message._id, message])).values()
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) as ChatMessage[];

  return {
    messages: uniqueMessages,
    isLoading,
    error: error ? error.message : null,
    isTyping,
    inputMessage,
    isSending: isSending || sendMessageMutation.isPending,
    hasMore: !!hasNextPage,
    loadingMore: isFetchingNextPage,
    setInputMessage,
    sendMessage: async (content: string) => {
      await sendMessageMutation.mutateAsync(content);
    },
    loadMoreMessages: async () => {
      await fetchNextPage();
    },
  };
} 