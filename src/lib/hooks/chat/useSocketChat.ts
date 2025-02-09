import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/lib/socket';
import { ChatMessage, MessagesResponse } from '@/lib/types/chat';
import { InfiniteData } from '@tanstack/react-query';

interface UseSocketChatProps {
  conversationId?: string;
  currentUserId?: string;
  otherUserId?: string;
}

export function useSocketChat({ conversationId, currentUserId, otherUserId }: UseSocketChatProps) {
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Join/Leave room effect
  useEffect(() => {
    if (!conversationId) return;

    socketService.joinRoom(conversationId);

    return () => {
      socketService.leaveRoom(conversationId);
    };
  }, [conversationId]);

  // Handle new messages
  useEffect(() => {
    if (!conversationId) return;

    const handleNewMessage = (message: ChatMessage) => {
      if (message.conversationId === conversationId) {
        // Immediately update the messages in the cache
        queryClient.setQueryData<InfiniteData<MessagesResponse>>(
          ["chat-messages", conversationId],
          (old) => {
            if (!old) {
              // 如果是第一条消息，创建初始结构而不是返回null
              return {
                pages: [{
                  messages: [{ ...message, status: 'delivered' }],
                  hasMore: false
                }],
                pageParams: [null]
              };
            }
            const newPages = [...old.pages];
            const lastPage = newPages[newPages.length - 1];
            if (!lastPage.messages.some(msg => msg._id === message._id)) {
              lastPage.messages = [...lastPage.messages, { ...message, status: 'delivered' }];
            }
            return { ...old, pages: newPages };
          }
        );

        // 只有在不是第一条消息时才触发重新获取
        const currentData = queryClient.getQueryData<InfiniteData<MessagesResponse>>(
          ["chat-messages", conversationId]
        );
        if (currentData && currentData.pages[0].messages.length > 1) {
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", conversationId],
            exact: true,
            refetchType: "all"
          });
        }

        // Mark message as delivered
        socketService.sendMessageDelivered(message._id);

        // If window is focused, mark as read immediately
        if (document.hasFocus()) {
          socketService.sendMessageRead(message._id);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When tab becomes visible, refetch messages
        queryClient.invalidateQueries({
          queryKey: ["chat-messages", conversationId],
          exact: true,
          refetchType: "all"
        });
      }
    };

    const handleFocus = () => {
      // When window gains focus, refetch messages
      queryClient.invalidateQueries({
          queryKey: ["chat-messages", conversationId],
          exact: true,
          refetchType: "all"
      });
    };

    socketService.onNewMessage(handleNewMessage);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      socketService.removeEventListener('message', handleNewMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [conversationId, queryClient]);

  // Handle message status updates
  useEffect(() => {
    if (!conversationId) return;

    const handleMessageDelivered = (messageId: string) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg._id === messageId ? { ...msg, status: "delivered" } : msg
              ),
            })),
          };
        }
      );
    };

    const handleMessageRead = (messageId: string) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["chat-messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg._id === messageId ? { ...msg, status: "read", read: true } : msg
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
  }, [conversationId, queryClient]);

  // Handle typing status
  const handleTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId || !currentUserId) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      socketService.sendTyping({
        conversationId,
        userId: currentUserId,
        typing,
      });

      if (typing) {
        typingTimeoutRef.current = setTimeout(() => {
          socketService.sendTyping({
            conversationId,
            userId: currentUserId,
            typing: false,
          });
        }, 3000);
      }
    },
    [conversationId, currentUserId]
  );

  // Listen for typing status changes
  useEffect(() => {
    if (!conversationId || !otherUserId) return;

    const handleUserTyping = ({ userId, typing }: { userId: string; typing: boolean }) => {
      if (userId === otherUserId) {
        queryClient.setQueryData(["chat-typing-status", userId], typing);
      }
    };

    socketService.onUserTyping(handleUserTyping);

    return () => {
      socketService.removeEventListener("user-typing", handleUserTyping);
      queryClient.setQueryData(["chat-typing-status", otherUserId], false);
    };
  }, [conversationId, otherUserId, queryClient]);

  return {
    handleTyping,
    sendMessage: (message: ChatMessage) => socketService.sendMessage(message),
  };
} 