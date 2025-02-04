// components/useChat.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { socketService } from "@/lib/socket";
import { 
  ChatMessage, 
  MessageStatus, 
  MessageContent, 
  ObjectDiscussionData,
  UseChatProps,
  MessagesResponse,
} from '@/lib/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { useChatData } from './useChatData';

const MESSAGE_CACHE_TIME = 1000 * 60 * 30; 
const TYPING_TIMEOUT = 3000; //  seconds typing timeout

export function useChat(props: UseChatProps | null) {
  const queryClient = useQueryClient();
  const [inputMessage, setInputMessage] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [isTyping, setIsTyping] = useState(false);

  // Use the chat data hook
  const {
    isLoadingMessages,
    messagesError,
    sendMessage: sendMessageData,
    deleteMessages: deleteMessagesData,
    isSending,
  } = useChatData({
    userId: props?.otherUser._id || '',
    conversationId: props?.conversationId,
    otherUser: props?.otherUser,
  });

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

  // Query for fetching messages
  const {
    data,
    fetchNextPage: queryFetchNextPage,
    hasNextPage: queryHasNextPage,
    isFetchingNextPage: queryIsFetchingNextPage,
    isLoading: queryIsLoading,
    error: queryError,
  } = useInfiniteQuery<MessagesResponse>({
    queryKey: ["chat-messages", props?.conversationId],
    queryFn: async ({ pageParam = undefined }) => {
      if (!props?.conversationId) throw new Error("No conversation ID");
      
      const url = new URL("/api/chat/messages", window.location.origin);
      url.searchParams.append("conversationId", props.conversationId);
      if (pageParam) {
        url.searchParams.append("before", pageParam as string);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      return data as MessagesResponse;
    },
    getNextPageParam: (lastPage: MessagesResponse) => {
      if (!lastPage.hasMore) return undefined;
      const firstMessage = lastPage.messages[0];
      return firstMessage?._id;
    },
    enabled: !!props?.conversationId,
    staleTime: MESSAGE_CACHE_TIME,
    initialPageParam: undefined,
  });

  // Mutation for sending messages
  const sendMessageMutation = useMutation<ChatMessage, Error, MessageContent>({
    mutationFn: async (content: MessageContent) => {
      if (!props?.conversationId) throw new Error("No conversation ID");
      
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: props.conversationId,
          content,
          receiverId: props.otherUser._id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      return data as ChatMessage;
    },
    onSuccess: (newMessage) => {
      // Update the messages cache with the new message
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props?.conversationId],
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          const lastPage = newPages[newPages.length - 1];
          lastPage.messages = [...lastPage.messages, newMessage];
          return {
            ...old,
            pages: newPages,
          };
        }
      );

      // Send the message through socket
      socketService.sendMessage(newMessage);
    },
  });

  // Mutation for deleting messages
  const deleteMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!props?.conversationId) throw new Error("No conversation ID");
      
      const response = await fetch('/api/chat/messages', {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: props.conversationId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete messages");
      }
    },
    onSuccess: () => {
      // 完全移除消息缓存而不是设置空数组
      queryClient.removeQueries({ queryKey: ["chat-messages", props?.conversationId] });
    },
    onError: (error) => {
      console.error("Error deleting messages:", error);
      throw error;
    }
  });

  // Listen to socket updates
  useEffect(() => {
    if (!props?.conversationId) return;

    const handleNewMessage = (message: ChatMessage) => {
      if (message.conversationId === props.conversationId) {
        // Update the messages cache with the new message
        queryClient.setQueryData<InfiniteData<MessagesResponse>>(
          ["chat-messages", props.conversationId],
          (old) => {
            if (!old) return old;
            const newPages = [...old.pages];
            const lastPage = newPages[newPages.length - 1];
            // Check if message already exists
            if (!lastPage.messages.some(msg => msg._id === message._id)) {
              lastPage.messages = [...lastPage.messages, { ...message, status: 'delivered' }];
            }
            return {
              ...old,
              pages: newPages,
            };
          }
        );
      }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.removeEventListener('message', handleNewMessage);
    };
  }, [props?.conversationId, queryClient]);

  // Flatten messages from all pages
  const allMessages = data?.pages.flatMap((page) => page.messages) ?? [];
  const uniqueMessages = Array.from(
    new Map(allMessages.map((msg) => [msg._id, msg])).values()
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Get other user's typing status
  const otherUserTyping = queryClient.getQueryData<boolean>(
    ["chat-typing-status", props?.otherUser._id]
  ) || false;

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
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props.conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: [data as MessagesResponse],
          };
        }
      );
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadMoreMessages = async () => {
    if (!props || !queryHasNextPage) return;

    try {
      const oldestMessage = allMessages[0];
      const response = await fetch(
        `/api/chat/messages?conversationId=${props.conversationId}&before=${oldestMessage?._id}`
      );
      if (!response.ok) {
        throw new Error('Failed to load more messages');
      }
      const data = await response.json();
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props.conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: [data as MessagesResponse],
          };
        }
      );
    } catch (error) {
      console.error('Error loading more messages:', error);
    }
  };

  const sendMessage = async (content: string | ObjectDiscussionData) => {
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

    queryClient.setQueryData<InfiniteData<MessagesResponse>>(
      ["chat-messages", props.conversationId],
      (old) => {
        if (!old) return old;
        const newPages = [...old.pages];
        const lastPage = newPages[newPages.length - 1];
        // Check if message already exists
        if (!lastPage.messages.some(msg => msg._id === tempId)) {
          lastPage.messages = [...lastPage.messages, { ...newMessage, status: 'delivered' }];
        }
        return {
          ...old,
          pages: newPages,
        };
      }
    );

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
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props.conversationId],
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          const lastPage = newPages[newPages.length - 1];
          lastPage.messages = [...lastPage.messages, { ...data, status: 'sent' }];
          return {
            ...old,
            pages: newPages,
          };
        }
      );

      socketService.sendMessage(data);
    } catch (error) {
      console.error('Error sending message:', error);
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", props.conversationId],
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          const lastPage = newPages[newPages.length - 1];
          lastPage.messages = [...lastPage.messages, { ...newMessage, status: 'error' }];
          return {
            ...old,
            pages: newPages,
          };
        }
      );
    }
  };

  return {
    messages: uniqueMessages,
    isLoading: isLoadingMessages || queryIsLoading,
    error: messagesError || queryError,
    isTyping,
    inputMessage,
    isSending,
    hasMore: queryHasNextPage,
    loadingMore: queryIsFetchingNextPage,
    setInputMessage,
    sendMessage: async (content: MessageContent) => {
      await sendMessageData(content);
      setInputMessage("");
    },
    loadMoreMessages: async () => {
      await queryFetchNextPage();
    },
    deleteMessages: async () => {
      await deleteMessagesData();
    },
  };
}