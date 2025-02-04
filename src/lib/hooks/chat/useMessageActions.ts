import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageContent, MessagesResponse } from '@/lib/types/chat';
import { useSocketChat } from './useSocketChat';

interface UseMessageActionsProps {
  conversationId?: string;
  currentUserId?: string;
  otherUserId?: string;
  handleMessageSubmit: (e: React.FormEvent) => Promise<string | undefined>;
}

export function useMessageActions({ 
  conversationId, 
  currentUserId, 
  otherUserId,
  handleMessageSubmit,
}: UseMessageActionsProps) {
  const queryClient = useQueryClient();
  const { sendMessage: sendSocketMessage } = useSocketChat({ 
    conversationId, 
    currentUserId, 
    otherUserId 
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: MessageContent) => {
      if (!conversationId || !otherUserId) {
        throw new Error('Missing required data');
      }

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content,
          receiverId: otherUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onMutate: async (content: MessageContent) => {
      if (!conversationId || !currentUserId || !otherUserId) return;

      // Create optimistic message
      const tempId = uuidv4();
      const optimisticMessage: ChatMessage = {
        _id: tempId,
        conversationId,
        content,
        senderId: currentUserId,
        receiverId: otherUserId,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      // Update cache optimistically
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ['chat-messages', conversationId],
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          const lastPage = newPages[newPages.length - 1];
          lastPage.messages = [...lastPage.messages, optimisticMessage];
          return { ...old, pages: newPages };
        }
      );

      return { optimisticMessage };
    },
    onSuccess: (newMessage, _, context) => {
      if (!conversationId) return;

      // Update cache with actual message
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ['chat-messages', conversationId],
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          const lastPage = newPages[newPages.length - 1];
          lastPage.messages = lastPage.messages.map(msg => 
            msg._id === context?.optimisticMessage._id ? { ...newMessage, status: 'sent' } : msg
          );
          return { ...old, pages: newPages };
        }
      );

      // Send through socket
      sendSocketMessage(newMessage);
    },
    onError: (error, _, context) => {
      if (!conversationId) return;

      // Revert optimistic update
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ['chat-messages', conversationId],
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          const lastPage = newPages[newPages.length - 1];
          lastPage.messages = lastPage.messages.map(msg => 
            msg._id === context?.optimisticMessage._id ? { ...msg, status: 'error' } : msg
          );
          return { ...old, pages: newPages };
        }
      );

      console.error('Error sending message:', error);
    },
  });

  // Delete messages mutation
  const deleteMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) {
        throw new Error('No conversation ID');
      }

      const response = await fetch('/api/chat/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete messages');
      }
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['chat-messages', conversationId] });
    },
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    const message = await handleMessageSubmit(e);
    if (message) {
      await sendMessageMutation.mutateAsync(message);
    }
  };

  return {
    sendMessage: (content: MessageContent) => sendMessageMutation.mutateAsync(content),
    deleteMessages: () => deleteMessagesMutation.mutateAsync(),
    handleSubmit,
    isSending: sendMessageMutation.isPending,
    isDeleting: deleteMessagesMutation.isPending,
    sendError: sendMessageMutation.error,
    deleteError: deleteMessagesMutation.error,
  };
} 