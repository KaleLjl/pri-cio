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
        queryClient.setQueryData<InfiniteData<MessagesResponse>>(
          ["chat-messages", conversationId],
          (old) => {
            if (!old) return old;
            const newPages = [...old.pages];
            const lastPage = newPages[newPages.length - 1];
            if (!lastPage.messages.some(msg => msg._id === message._id)) {
              lastPage.messages = [...lastPage.messages, { ...message, status: 'delivered' }];
            }
            return { ...old, pages: newPages };
          }
        );
      }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.removeEventListener('message', handleNewMessage);
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