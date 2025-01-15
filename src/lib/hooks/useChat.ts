import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatUser, MessageStatus } from '@/lib/types/chat';
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { socketService } from '@/lib/socket';

// Constants
const MESSAGES_PER_PAGE = 20;
const MESSAGE_CACHE_TIME = 1000 * 60 * 30; // 30 minutes
const MESSAGE_STALE_TIME = 1000 * 60 * 5; // 5 minutes

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

interface MutationContext {
  optimisticMessage: ChatMessage;
}

interface ChatHistoryRecord {
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
  updatedAt: string;
}

export function useChat(props: UseChatProps | null): ChatHookResult {
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSending, setIsSending] = useState(false);
  const messageCache = useRef<Map<string, ChatMessage>>(new Map());

  // Handle typing status
  const handleTyping = useCallback((typing: boolean) => {
    if (!props?.conversationId || !props?.currentUserId) return;
    socketService.sendTyping({
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

  // Socket connection setup
  useEffect(() => {
    if (!props?.conversationId || !props?.currentUserId) return;

    // Connect to socket
    socketService.connect(props.currentUserId);
    socketService.joinRoom(props.conversationId);

    // Set up event listeners
    socketService.onNewMessage((message: ChatMessage) => {
      messageCache.current.set(message._id, message);
      
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(['chat-messages', props.conversationId], (old) => {
        if (!old) return { pages: [{ messages: [message], hasMore: false }], pageParams: [1] };
        
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          const lastPage = newPages[newPages.length - 1];
          if (!lastPage.messages.some(msg => msg._id === message._id)) {
            lastPage.messages = [...lastPage.messages, message];
          }
        }
        
        return { ...old, pages: newPages };
      });

      // Update chat history cache
      queryClient.setQueryData<ChatHistoryRecord[]>(['chat-history'], (oldChats) => {
        if (!oldChats) return oldChats;

        return oldChats.map((chat) => {
          if (chat._id === props.conversationId) {
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
    });

    socketService.onMessageDelivered((messageId: string) => {
      updateMessageStatus(messageId, 'delivered');
    });

    socketService.onMessageRead((messageId: string) => {
      updateMessageStatus(messageId, 'read');
    });

    socketService.onUserTyping((data: { userId: string; typing: boolean }) => {
      if (data.userId === props.otherUser._id) {
        setIsTyping(data.typing);
      }
    });

    return () => {
      if (props.conversationId) {
        socketService.leaveRoom(props.conversationId);
      }
      socketService.removeAllListeners();
    };
  }, [props?.conversationId, props?.currentUserId, props?.otherUser?._id, queryClient, updateMessageStatus]);

  // Prefetch next page of messages
  const prefetchNextPage = useCallback(async (pageParam: number) => {
    if (!props?.conversationId) return;
    
    try {
      const response = await fetch(
        `/api/chat/messages?conversationId=${props.conversationId}&page=${pageParam}&limit=${MESSAGES_PER_PAGE}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      queryClient.setQueryData(['chat-messages', props.conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: [...old.pages, data]
        };
      });
    } catch (error) {
      console.error('Error prefetching messages:', error);
    }
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
      
      // Check cache first
      const cacheKey = `${props.conversationId}-${pageParam}`;
      const cachedData = messageCache.current.get(cacheKey);
      if (cachedData) {
        return {
          messages: [cachedData],
          hasMore: false,
          nextPage: undefined
        } as MessagesResponse;
      }
      
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
      
      // Cache the messages
      data.messages.forEach((msg: ChatMessage) => {
        messageCache.current.set(`${msg._id}`, msg);
      });
      
      // Prefetch next page if there are more messages
      if (data.hasMore) {
        prefetchNextPage(pageParam + 1);
      }
      
      return {
        messages: data.messages as ChatMessage[],
        hasMore: data.hasMore as boolean,
        nextPage: data.hasMore ? (pageParam as number) + 1 : undefined
      } as MessagesResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: MESSAGE_STALE_TIME,
    gcTime: MESSAGE_CACHE_TIME,
    refetchOnWindowFocus: false,
    enabled: !!props?.conversationId,
  });

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation<ChatMessage, Error, string, MutationContext>({
    mutationFn: async (content: string) => {
      if (!props?.conversationId) throw new Error('No conversation ID');
      setIsSending(true);
      
      // Create optimistic message
      const optimisticMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        conversationId: props.conversationId,
        senderId: props.currentUserId,
        content,
        createdAt: new Date().toISOString(),
        status: 'sending'
      };

      // Add to cache immediately
      messageCache.current.set(optimisticMessage._id, optimisticMessage);
      
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
        // Update cache with real message
        messageCache.current.delete(optimisticMessage._id);
        messageCache.current.set(newMessage._id, { ...newMessage, status: 'sending' });
        
        return { ...newMessage, status: 'sending' } as ChatMessage;
      } finally {
        setIsSending(false);
      }
    },
    onMutate: async (content) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chat-messages', props?.conversationId] });
      
      // Create optimistic message
      const optimisticMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        conversationId: props!.conversationId,
        senderId: props!.currentUserId,
        content,
        createdAt: new Date().toISOString(),
        status: 'sending'
      };

      // Add optimistic message to cache
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(['chat-messages', props?.conversationId], (old) => {
        if (!old) return { pages: [{ messages: [optimisticMessage], hasMore: false }], pageParams: [1] };
        
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          const lastPage = newPages[newPages.length - 1];
          lastPage.messages = [...lastPage.messages, optimisticMessage];
        }
        
        return { ...old, pages: newPages };
      });

      return { optimisticMessage };
    },
    onSuccess: (newMessage, _, context) => {
      // Remove optimistic message and add real message
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(['chat-messages', props?.conversationId], (old) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            messages: page.messages.map(msg => 
              msg._id === context?.optimisticMessage._id ? newMessage : msg
            )
          }))
        };
      });

      // Update chat history cache
      queryClient.setQueryData<ChatHistoryRecord[]>(['chat-history'], (oldChats) => {
        if (!oldChats) return oldChats;

        return oldChats.map((chat) => {
          if (chat._id === props?.conversationId) {
            return {
              ...chat,
              lastMessage: {
                _id: newMessage._id,
                content: newMessage.content,
                createdAt: newMessage.createdAt,
                senderId: newMessage.senderId
              },
              updatedAt: newMessage.createdAt
            };
          }
          return chat;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });

      // Emit to socket and update status
      socketService.sendMessage(newMessage);
      updateMessageStatus(newMessage._id, 'sent');
    },
    onError: (error, _, context) => {
      console.error('Failed to send message:', error);
      // Revert optimistic update
      if (context?.optimisticMessage) {
        queryClient.setQueryData<InfiniteData<MessagesResponse>>(['chat-messages', props?.conversationId], (old) => {
          if (!old) return old;
          
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              messages: page.messages.filter(msg => msg._id !== context.optimisticMessage._id)
            }))
          };
        });
      }
    }
  });

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
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

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