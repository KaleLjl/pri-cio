import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageContent } from '@/lib/types/chat';
import { useContext } from 'react';
import { SocketContext } from '@/context/SocketContext';
import { messageApiService } from '@/lib/services/api/chat/messageService';

interface UseMessageActionsProps {
  conversationId?: string;
  currentUserId?: string;
  otherUserId?: string;
  handleMessageSubmit: (message: string) => void;
}

export function useMessageActions({ 
  conversationId, 
  currentUserId, 
  otherUserId,
  handleMessageSubmit,
}: UseMessageActionsProps) {
  const queryClient = useQueryClient();
  const socket = useContext(SocketContext);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: MessageContent) => {
      if (!conversationId || !otherUserId) {
        throw new Error('Missing required data');
      }

      return messageApiService.sendMessage(conversationId, content, otherUserId);
    },
    onMutate: async (content: MessageContent) => {
      if (!conversationId || !currentUserId || !otherUserId) return;

      const optimisticMessage: ChatMessage = {
        _id: uuidv4(),
        conversationId,
        senderId: currentUserId,
        receiverId: otherUserId,
        content,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chat-messages', conversationId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['chat-messages', conversationId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['chat-messages', conversationId], (old: any) => ({
        pages: old?.pages?.map((page: any, index: number) => ({
          ...page,
          messages: index === 0 ? [...page.messages, optimisticMessage] : page.messages,
        })) || [],
        pageParams: old?.pageParams || [],
      }));

      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      if (context?.previousMessages && conversationId) {
        queryClient.setQueryData(['chat-messages', conversationId], context.previousMessages);
      }
    },
    onSettled: () => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
      }
    },
  });

  // Delete messages mutation
  const deleteMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) {
        throw new Error('No conversation ID');
      }
      return messageApiService.deleteMessages(conversationId);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['chat-messages', conversationId] });
    },
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.currentTarget as HTMLFormElement).querySelector('input[type="text"]') as HTMLInputElement;
    const message = input?.value.trim();
    
    if (message) {
      handleMessageSubmit(message);
      await sendMessageMutation.mutateAsync(message);
    }
  };

  return {
    sendMessage: (content: MessageContent) => sendMessageMutation.mutateAsync(content),
    deleteMessages: () => deleteMessagesMutation.mutateAsync(),
    handleSubmit,
    isLoading: sendMessageMutation.isPending,
    isDeleting: deleteMessagesMutation.isPending,
    error: sendMessageMutation.error,
    deleteError: deleteMessagesMutation.error,
  };
} 