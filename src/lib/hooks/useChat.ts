// components/useChat.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { socketService } from "@/lib/socket";
import { ChatMessage, ChatUser, MessageStatus } from "@/lib/types/chat";

const MESSAGES_PER_PAGE = 20;
const MESSAGE_CACHE_TIME = 1000 * 60 * 30; 
const MESSAGE_STALE_TIME = 1000 * 60 * 5;

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
  const [inputMessage, setInputMessage] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isSending, setIsSending] = useState(false);

  const handleTyping = useCallback(
    (typing: boolean) => {
      if (!props?.conversationId || !props?.currentUserId) return;
      socketService.sendTyping({
        conversationId: props.conversationId,
        userId: props.currentUserId,
        typing,
      });
    },
    [props?.conversationId, props?.currentUserId]
  );

  // Socket effect - 只处理加入/离开房间
  useEffect(() => {
    if (!props?.conversationId) return;

    // 加入房间
    socketService.joinRoom(props.conversationId);

    return () => {
      socketService.leaveRoom(props.conversationId);
    };
  }, [props?.conversationId]);

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
    typingTimeoutRef.current = setTimeout(() => handleTyping(false), 2000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [inputMessage, handleTyping]);

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
    staleTime: MESSAGE_STALE_TIME,
    gcTime: MESSAGE_CACHE_TIME,
    refetchOnWindowFocus: false,
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
        return { ...newMessage, status: "sending" } as ChatMessage;
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
        status: "sending",
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
  const isTyping = queryClient.getQueryData<boolean>(["chat-typing-status", props?.otherUser._id]) || false;

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