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
  const [isTyping, setIsTyping] = useState(false);
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

  const updateMessageStatus = useCallback(
    (messageId: string, status: MessageStatus) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props?.conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg._id === messageId ? { ...msg, status } : msg
              ),
            })),
          };
        }
      );
    },
    [props?.conversationId, queryClient]
  );

  const addMessageToCache = useCallback(
    (message: ChatMessage) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props?.conversationId],
        (old) => {
          if (!old) {
            return {
              pages: [
                {
                  messages: [message],
                  hasMore: false,
                },
              ],
              pageParams: [1],
            };
          }

          const messageExists = old.pages.some((page) =>
            page.messages.some((msg) => msg._id === message._id)
          );
          if (messageExists) return old;

          const newPages = [...old.pages];
          const lastPage = newPages[newPages.length - 1];
          if (lastPage) {
            lastPage.messages = [...lastPage.messages, message];
          }
          return {
            ...old,
            pages: newPages,
          };
        }
      );

      // 更新 chat-history 缓存
      queryClient.setQueryData<ChatHistoryRecord[]>(["chat-history"], (oldChats) => {
        if (!oldChats) return oldChats;
        return oldChats
          .map((chat) => {
            if (chat._id === props?.conversationId) {
              return {
                ...chat,
                lastMessage: {
                  _id: message._id,
                  content: message.content,
                  createdAt: message.createdAt,
                  senderId: message.senderId,
                },
                updatedAt: message.createdAt,
              };
            }
            return chat;
          })
          .sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      });
    },
    [props?.conversationId, queryClient]
  );

  // 添加新消息处理函数
  const handleNewMessage = useCallback((message: ChatMessage) => {
    console.log("Received new message in chat:", message);
    
    // 更新消息列表
    queryClient.setQueryData<InfiniteData<MessagesResponse>>(
      ["chat-messages", props?.conversationId],
      (old) => {
        if (!old) {
          return {
            pages: [{ messages: [message], hasMore: false }],
            pageParams: [1],
          };
        }

        // 检查消息是否已存在
        const messageExists = old.pages.some((page) =>
          page.messages.some((msg) => msg._id === message._id)
        );

        if (messageExists) {
          return old;
        }

        // 添加新消息到最后一页
        const newPages = [...old.pages];
        const lastPage = newPages[newPages.length - 1];
        if (lastPage) {
          lastPage.messages = [...lastPage.messages, message];
        }

        return {
          ...old,
          pages: newPages,
        };
      }
    );
  }, [props?.conversationId, queryClient]);

  // Socket effect
  useEffect(() => {
    if (!props?.conversationId || !props?.currentUserId) return;

    let mounted = true;

    // 加入房间
    socketService.joinRoom(props.conversationId);

    const handleNewMessage = (message: ChatMessage) => {
      if (!mounted) return;
      addMessageToCache(message);
    };
    const handleMessageDelivered = (messageId: string) => {
      if (!mounted) return;
      updateMessageStatus(messageId, "delivered");
    };
    const handleMessageRead = (messageId: string) => {
      if (!mounted) return;
      updateMessageStatus(messageId, "read");
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
      socketService.leaveRoom(props.conversationId);
      socketService.removeAllListeners(); // 或者只 remove 相关事件
    };
  }, [
    props?.conversationId,
    props?.currentUserId,
    props?.otherUser?._id,
    addMessageToCache,
    updateMessageStatus,
  ]);

  // 预取下一页
  const prefetchNextPage = useCallback(
    async (pageParam: number) => {
      if (!props?.conversationId) return;
      try {
        const response = await fetch(
          `/api/chat/messages?conversationId=${props.conversationId}&page=${pageParam}&limit=${MESSAGES_PER_PAGE}`
        );
        if (!response.ok) return;
        const data = await response.json();
        queryClient.setQueryData(["chat-messages", props.conversationId], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: [...old.pages, data],
          };
        });
      } catch (err) {
        console.error("Error prefetching messages:", err);
      }
    },
    [props?.conversationId, queryClient]
  );

  // useInfiniteQuery
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<MessagesResponse>({
    queryKey: ["chat-messages", props?.conversationId],
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
      if (!props?.conversationId) throw new Error("No conversation ID");
      const response = await fetch(
        `/api/chat/messages?conversationId=${props.conversationId}&page=${pageParam}&limit=${MESSAGES_PER_PAGE}`,
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
      if (resData.hasMore) {
        prefetchNextPage(pageParam + 1);
      }
      return {
        messages: resData.messages as ChatMessage[],
        hasMore: resData.hasMore as boolean,
        nextPage: resData.hasMore ? pageParam + 1 : undefined,
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
      await queryClient.cancelQueries(["chat-messages", props?.conversationId]);
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
      addMessageToCache(optimisticMessage);
      return { optimisticMessage };
    },
    onSuccess: (newMessage, _, context) => {
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
      updateMessageStatus(newMessage._id, "sent");
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

  const allMessages = data?.pages.flatMap((page) => page.messages) ?? [];
  const uniqueMessages = Array.from(
    new Map(allMessages.map((msg) => [msg._id, msg])).values()
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