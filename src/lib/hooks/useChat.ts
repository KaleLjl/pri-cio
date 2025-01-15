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

  // Add new message to cache
  const addMessageToCache = useCallback((message: ChatMessage) => {
    console.log('Adding message to cache:', message);
    queryClient.setQueryData<InfiniteData<MessagesResponse>>(['chat-messages', props?.conversationId], (old) => {
      if (!old) return {
        pages: [{
          messages: [message],
          hasMore: false
        }],
        pageParams: [1]
      };

      // Check if message already exists
      const messageExists = old.pages.some(page => 
        page.messages.some(msg => msg._id === message._id)
      );

      if (messageExists) {
        console.log('Message already exists in cache:', message._id);
        return old;
      }

      console.log('Adding new message to cache:', message._id);
      // Add new message to the last page
      const newPages = [...old.pages];
      const lastPage = newPages[newPages.length - 1];
      if (lastPage) {
        lastPage.messages = [...lastPage.messages, message];
      }

      // Force a re-render by creating a new reference
      return {
        ...old,
        pages: [...newPages]
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
  }, [props?.conversationId, queryClient]);

  // Socket connection setup
  useEffect(() => {
    if (!props?.conversationId || !props?.currentUserId) return;

    let mounted = true;

    // Connect to socket
    socketService.connect(props.currentUserId);
    socketService.joinRoom(props.conversationId);

    // Set up event listeners
    const handleNewMessage = (message: ChatMessage) => {
      console.log('Received new message in hook:', message);
      if (!mounted) return;
      
      messageCache.current.set(message._id, message);
      // Use setTimeout to ensure the state update happens in the next tick
      setTimeout(() => {
        if (mounted) {
          addMessageToCache(message);
        }
      }, 0);
    };

    const handleMessageDelivered = (messageId: string) => {
      if (!mounted) return;
      updateMessageStatus(messageId, 'delivered');
    };

    const handleMessageRead = (messageId: string) => {
      if (!mounted) return;
      updateMessageStatus(messageId, 'read');
    };

    const handleUserTyping = (data: { userId: string; typing: boolean }) => {
      if (!mounted) return;
      if (data.userId === props.otherUser._id) {
        setIsTyping(data.typing);
      }
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onMessageDelivered(handleMessageDelivered);
    socketService.onMessageRead(handleMessageRead);
    socketService.onUserTyping(handleUserTyping);

    return () => {
      mounted = false;
      if (props.conversationId) {
        socketService.leaveRoom(props.conversationId);
      }
      socketService.removeAllListeners();
    };
  }, [props?.conversationId, props?.currentUserId, props?.otherUser?._id, addMessageToCache, updateMessageStatus]);

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

  // Send message mutation
  const sendMessageMutation = useMutation<ChatMessage, Error, string, MutationContext>({
    mutationFn: async (content: string) => {
      if (!props?.conversationId) throw new Error('No conversation ID');
      setIsSending(true);
      
      // Create optimistic message
      const optimisticMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        conversationId: props.conversationId,
        senderId: props.currentUserId,
        receiverId: props.otherUser._id,
        content,
        createdAt: new Date().toISOString(),
        status: 'sending',
        read: false
      };

      try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: props.conversationId,
            receiverId: props.otherUser._id,
            content
          }),
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
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ['chat-messages', props?.conversationId] });
      
      const optimisticMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        conversationId: props!.conversationId,
        senderId: props!.currentUserId,
        receiverId: props!.otherUser._id,
        content,
        createdAt: new Date().toISOString(),
        status: 'sending',
        read: false
      };

      addMessageToCache(optimisticMessage);
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
            messages: page.messages
              .filter(msg => msg._id !== context?.optimisticMessage._id)
              .concat(newMessage)
          }))
        };
      });

      // Emit to socket and update status
      socketService.sendMessage(newMessage);
      updateMessageStatus(newMessage._id, 'sent');
    },
    onError: (error, _, context) => {
      console.error('Failed to send message:', error);
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