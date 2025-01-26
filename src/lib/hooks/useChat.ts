// components/useChat.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { socketService } from "@/lib/socket";
import { ChatMessage, ChatUser, MessageStatus, MessageContent } from "@/lib/types/chat";
import { v4 as uuidv4 } from 'uuid';

const MESSAGES_PER_PAGE = 20;
const MESSAGE_CACHE_TIME = 1000 * 60 * 30; 
const TYPING_TIMEOUT = 3000; //  seconds typing timeout

interface UseChatProps {
  conversationId: string;
  currentUserId: string;
  otherUser: ChatUser;
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

export function useChat(props: UseChatProps | null) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const handleTyping = useCallback(
    (typing: boolean) => {
      if (!props?.conversationId || !props?.currentUserId) return;
      
      // Only emit if the typing status has changed
      if (isTyping !== typing) {
        setIsTyping(typing);
        socketService.sendTyping({
          conversationId: props.conversationId,
          userId: props.currentUserId,
          typing,
        });
      }
    },
    [props?.conversationId, props?.currentUserId, isTyping]
  );

  // Socket effect - 只处理加入/离开房间
  useEffect(() => {
    if (!props?.conversationId) return;

    // 加入房间
    socketService.joinRoom(props.conversationId);

    return () => {
      // 确保在离开房间时清除typing状态
      handleTyping(false);
      socketService.leaveRoom(props.conversationId);
    };
  }, [props?.conversationId, handleTyping]);

  // 处理输入状态
  useEffect(() => {
    if (!inputMessage) {
      handleTyping(false);
      return;
    }

    handleTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, TYPING_TIMEOUT);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [inputMessage, handleTyping]);

  // Socket effect for typing status
  useEffect(() => {
    if (!props?.conversationId || !props?.otherUser?._id) return;

    const handleUserTyping = ({ userId, typing }: { userId: string; typing: boolean }) => {
      if (userId === props.otherUser?._id) {
        queryClient.setQueryData(["chat-typing-status", userId], typing);
        
        // 如果收到typing=false，立即更新状态
        if (!typing) {
          queryClient.setQueryData(["chat-typing-status", userId], false);
        }
      }
    };

    socketService.onUserTyping(handleUserTyping);

    return () => {
      socketService.removeEventListener("user-typing", handleUserTyping);
      // 清除typing状态
      queryClient.setQueryData(["chat-typing-status", props.otherUser._id], false);
    };
  }, [props?.conversationId, props?.otherUser?._id, queryClient]);

  // Socket effect for message status updates
  useEffect(() => {
    if (!props?.conversationId) return;

    const handleMessageDelivered = (messageId: string) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props.conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg._id === messageId
                  ? { ...msg, status: "delivered" as MessageStatus }
                  : msg
              ),
            })),
          };
        }
      );
    };

    const handleMessageRead = (messageId: string) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props.conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg._id === messageId
                  ? { ...msg, status: "read" as MessageStatus, read: true }
                  : msg
              ),
            })),
          };
        }
      );
    };

    socketService.onMessageDelivered(handleMessageDelivered);
    socketService.onMessageRead(handleMessageRead);

    return () => {
      socketService.removeEventListener("message-delivered", handleMessageDelivered);
      socketService.removeEventListener("message-read", handleMessageRead);
    };
  }, [props?.conversationId, queryClient]);

  // useInfiniteQuery
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<MessagesResponse, Error, InfiniteData<MessagesResponse>, [string, string | undefined], number>({
    queryKey: ["chat-messages", props?.conversationId],
    queryFn: async ({ pageParam }) => {
      if (!props?.conversationId) throw new Error("No conversation ID");
      const page = typeof pageParam === 'number' ? pageParam : 1;
      const response = await fetch(
        `/api/chat/messages?conversationId=${props.conversationId}&page=${page}&limit=${MESSAGES_PER_PAGE}`,
        {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const resData = await response.json();
      return {
        messages: resData.messages as ChatMessage[],
        hasMore: resData.hasMore as boolean,
        nextPage: resData.hasMore ? page + 1 : undefined,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 0,
    gcTime: MESSAGE_CACHE_TIME,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    enabled: !!props?.conversationId,
  });

  const sendMessageMutation = useMutation<ChatMessage, Error, string, MutationContext>({
    mutationFn: async (content: string) => {
      if (!props?.conversationId) throw new Error("No conversation ID");
      setIsSending(true);
      try {
        const response = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: props.conversationId,
            receiverId: props.otherUser._id,
            content,
          }),
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to send message");
        }
        const newMessage = await response.json();
        return { ...newMessage, status: "sent" as MessageStatus } as ChatMessage;
      } finally {
        setIsSending(false);
      }
    },
    onMutate: async (content) => {
      const optimisticMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        conversationId: props!.conversationId,
        senderId: props!.currentUserId,
        receiverId: props!.otherUser._id,
        content,
        createdAt: new Date().toISOString(),
        status: "sending" as MessageStatus,
        read: false,
      };

      // 更新消息列表
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props?.conversationId],
        (old) => {
          if (!old) {
            return {
              pages: [{ messages: [optimisticMessage], hasMore: false }],
              pageParams: [1],
            };
          }

          const newPages = [...old.pages];
          const lastPage = newPages[newPages.length - 1];
          if (lastPage) {
            lastPage.messages = [...lastPage.messages, optimisticMessage];
          }

          return {
            ...old,
            pages: newPages,
          };
        }
      );

      return { optimisticMessage };
    },
    onSuccess: (newMessage, _, context) => {
      // 更新消息列表，替换临时消息
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props?.conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages
                .filter((msg) => msg._id !== context?.optimisticMessage._id)
                .concat(newMessage),
            })),
          };
        }
      );
      socketService.sendMessage(newMessage);
    },
    onError: (error, _, context) => {
      console.error("Failed to send message:", error);
      if (context?.optimisticMessage) {
        queryClient.setQueryData<InfiniteData<MessagesResponse>>(
          ["chat-messages", props?.conversationId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.filter(
                  (msg) => msg._id !== context.optimisticMessage._id
                ),
              })),
            };
          }
        );
      }
    },
  });

  const allMessages = data?.pages.flatMap((page) => page.messages) ?? [];
  const uniqueMessages = Array.from(
    new Map(allMessages.map((msg) => [msg._id, msg])).values()
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // 获取对方的输入状态
  const otherUserTyping = queryClient.getQueryData<boolean>(["chat-typing-status", props?.otherUser._id]) || false;

  useEffect(() => {
    if (!props) return;
    
    loadInitialMessages();
  }, [props?.conversationId]);

  const loadInitialMessages = async () => {
    if (!props) return;

    try {
      const response = await fetch(`/api/chat/messages?conversationId=${props.conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const data = await response.json();
      setMessages(data.messages);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadMoreMessages = async () => {
    if (!props || !hasMore) return;

    try {
      const oldestMessage = messages[0];
      const response = await fetch(
        `/api/chat/messages?conversationId=${props.conversationId}&before=${oldestMessage?._id}`
      );
      if (!response.ok) {
        throw new Error('Failed to load more messages');
      }
      const data = await response.json();
      setMessages(prevMessages => [...data.messages, ...prevMessages]);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error loading more messages:', error);
    }
  };

  const sendMessage = async (content: MessageContent) => {
    if (!props) return;

    const tempId = uuidv4();
    const newMessage: ChatMessage = {
      _id: tempId,
      conversationId: props.conversationId,
      content,
      senderId: props.currentUserId,
      receiverId: props.otherUser._id,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prev => [...prev, newMessage]);
    setIsSending(true);
    setInputMessage('');

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: props.conversationId,
          content,
          receiverId: props.otherUser._id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId
            ? { ...data, status: 'sent' }
            : msg
        )
      );

      socketService.sendMessage(data);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId
            ? { ...msg, status: 'error' }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessages = async () => {
    if (!props) return;

    try {
      const response = await fetch(`/api/chat/messages?conversationId=${props.conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete messages');
      }

      setMessages([]);
    } catch (error) {
      console.error('Error deleting messages:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!props) return;

    const handleNewMessage = (message: ChatMessage) => {
      if (message.conversationId === props.conversationId) {
        setMessages(prev => [...prev, { ...message, status: 'delivered' }]);
      }
    };

    const cleanup = socketService.onNewMessage(handleNewMessage);
    return () => {
      if (cleanup) cleanup();
    };
  }, [props?.conversationId]);

  return {
    messages,
    isLoading,
    error: error ? error.message : null,
    isTyping: otherUserTyping,
    inputMessage,
    isSending: isSending || sendMessageMutation.isPending,
    hasMore,
    loadingMore: isFetchingNextPage,
    setInputMessage,
    sendMessage,
    loadMoreMessages,
    deleteMessages,
  };
}