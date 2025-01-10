import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { default as socketIOClient } from 'socket.io-client';
import { ChatMessage, ChatUser, MessageStatus } from '@/lib/types/chat';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Constants
const MESSAGES_PER_PAGE = 10;
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
  setInputMessage: (value: string) => void;
  sendMessage: (content: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
}

interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

export function useChat(props: UseChatProps | null): ChatHookResult {
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch messages with React Query's useInfiniteQuery
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<MessagesResponse, Error>({
    queryKey: ['chat-messages', props?.conversationId],
    queryFn: async ({ pageParam }) => {
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
      
      const data: MessagesResponse = await response.json();
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: MessagesResponse, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep cache for 30 minutes
    refetchOnWindowFocus: false,
    enabled: !!props?.conversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation<ChatMessage, Error, string, { tempMessage: ChatMessage }>({
    mutationFn: async (content: string) => {
      if (!props?.conversationId) throw new Error('No conversation ID');
      
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: props.conversationId, content }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onMutate: async (content) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chat-messages', props?.conversationId] });

      // Create optimistic message
      const tempMessage: ChatMessage = {
        _id: Date.now().toString(),
        conversationId: props!.conversationId,
        senderId: props!.currentUserId,
        content,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      // Add optimistic message to cache
      queryClient.setQueryData<{ pages: { messages: ChatMessage[] }[] }>(['chat-messages', props?.conversationId], (old) => {
        if (!old) return { pages: [{ messages: [tempMessage] }] };
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          newPages[newPages.length - 1].messages.push(tempMessage);
        }
        return { ...old, pages: newPages };
      });

      return { tempMessage };
    },
    onSuccess: (newMessage, _, context) => {
      if (!context) return;
      
      // Update message status and emit to socket
      newMessage.status = 'sent';
      socketRef.current?.emit('send-message', newMessage);

      // Update cache with real message
      queryClient.setQueryData<{ pages: { messages: ChatMessage[] }[] }>(['chat-messages', props?.conversationId], (old) => {
        if (!old) return { pages: [{ messages: [newMessage] }] };
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          const messages = newPages[newPages.length - 1].messages;
          const index = messages.findIndex(m => m._id === context.tempMessage._id);
          if (index !== -1) {
            messages[index] = newMessage;
          }
        }
        return { ...old, pages: newPages };
      });
    },
    onError: (_, __, context) => {
      if (!context) return;
      
      // Revert optimistic update
      queryClient.setQueryData<{ pages: { messages: ChatMessage[] }[] }>(['chat-messages', props?.conversationId], (old) => {
        if (!old) return { pages: [] };
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          const messages = newPages[newPages.length - 1].messages;
          const index = messages.findIndex(m => m._id === context.tempMessage._id);
          if (index !== -1) {
            messages[index] = { ...context.tempMessage, status: 'error' };
          }
        }
        return { ...old, pages: newPages };
      });
    }
  });

  // Initialize socket connection
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
          queryClient.setQueryData(['chat-messages', props.conversationId], (old: any) => {
            const newPages = [...(old?.pages || [])];
            if (newPages.length > 0) {
              newPages[newPages.length - 1].messages.push(message);
            }
            return { ...old, pages: newPages };
          });
        });

        socket.on('user-typing', (data: { userId: string; typing: boolean }) => {
          if (data.userId === props.otherUser._id) {
            setIsTyping(data.typing);
          }
        });

        socket.on('message-status-update', ({ messageId, status }: { messageId: string, status: MessageStatus }) => {
          queryClient.setQueryData(['chat-messages', props.conversationId], (old: any) => {
            const newPages = [...(old?.pages || [])];
            newPages.forEach(page => {
              const message = page.messages.find((m: ChatMessage) => m._id === messageId);
              if (message) {
                message.status = status;
              }
            });
            return { ...old, pages: newPages };
          });
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('Socket initialization error:', error);
        // Retry connection after delay
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
  }, [props?.conversationId, props?.currentUserId, props?.otherUser?._id, queryClient]);

  // Handle typing status
  const handleTyping = useCallback((typing: boolean) => {
    if (!props?.conversationId || !props?.currentUserId) return;
    socketRef.current?.emit('typing', {
      conversationId: props.conversationId,
      userId: props.currentUserId,
      typing,
    });
  }, [props?.conversationId, props?.currentUserId]);

  // Handle input change with debounced typing indicator
  const handleInputChange = useCallback((value: string) => {
    setInputMessage(value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    handleTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 1000);
  }, [handleTyping]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Flatten messages from all pages
  const allMessages = data?.pages.flatMap(page => page.messages) || [];

  return {
    messages: allMessages,
    isLoading,
    error: error ? error.message : null,
    isTyping,
    inputMessage,
    isSending: sendMessageMutation.isPending,
    hasMore: !!hasNextPage,
    setInputMessage: handleInputChange,
    sendMessage: async (content: string) => {
      await sendMessageMutation.mutateAsync(content);
    },
    loadMoreMessages: async () => {
      await fetchNextPage();
    },
  };
} 