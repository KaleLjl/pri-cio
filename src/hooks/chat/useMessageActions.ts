import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageContent } from '@/lib/types/chat';
import { messageApiService } from '@/lib/services/api/chat/messageApiService';
import { socketService } from '@/lib/services/socket/socketService';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { useRef } from 'react';

interface UseMessageActionsProps {
  conversationId?: string;
  currentUserId?: string;
  otherUserId?: string;
  handleMessageSubmit?: (message: string) => void;
}

interface MutationContext {
  optimisticMessage: ChatMessage;
}

export function useMessageActions({ 
  conversationId, 
  currentUserId, 
  otherUserId,
  handleMessageSubmit,
}: UseMessageActionsProps) {
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnected = socketService.isConnected();

  // Initialize cache service
  chatCacheService.initialize(queryClient);

  // Handle typing status
  const handleTyping = (typing: boolean) => {
    if (!conversationId || !currentUserId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socketService.handleTypingStatus({
      conversationId,
      userId: currentUserId,
      typing,
    });

    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        socketService.handleTypingStatus({
          conversationId,
          userId: currentUserId,
          typing: false,
        });
      }, 3000);
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: MessageContent) => {
      if (!conversationId) {
        throw new Error('Missing conversation ID');
      }
      
      if (!currentUserId) {
        throw new Error('Missing current user ID');
      }
      
      if (!otherUserId) {
        throw new Error('Missing recipient user ID');
      }

      // Create optimistic message
      const optimisticMessage: ChatMessage = {
        _id: uuidv4(),
        conversationId,
        senderId: currentUserId,
        receiverId: otherUserId,
        content,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      // Step 1: Handle optimistic update in cache
      await chatCacheService.handleMessageSubmission(optimisticMessage);

      // Step 2: Send via socket if connected
      if (isConnected) {
        socketService.sendMessage(optimisticMessage);
      }

      // Step 3: Send via API
      const sentMessage = await messageApiService.sendMessage(conversationId, content, otherUserId);

      // Step 4: Update message status in cache
      await chatCacheService.handleMessageSendSuccess(optimisticMessage, sentMessage);

      return { sentMessage, optimisticMessage };
    },
    onError: async (error, content, context: MutationContext | undefined) => {
      console.error('Failed to send message:', error);
      
      if (context?.optimisticMessage) {
        await chatCacheService.handleMessageSendFailure(context.optimisticMessage._id);
      }
    }
  });

  // Delete messages mutation
  const deleteMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) {
        throw new Error('No conversation ID');
      }

      // Step 1: Delete via API
      await messageApiService.deleteMessages(conversationId);

      // Step 2: Clear cache
      await chatCacheService.clearConversationMessages(conversationId);

      // Step 3: Notify via socket if connected
      if (isConnected) {
        socketService.leaveRoom(conversationId);
      }
    }
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.currentTarget as HTMLFormElement).querySelector('input[type="text"]') as HTMLInputElement;
    const message = input?.value.trim();
    
    if (message) {
      // Log the conversationId for debugging
      console.log('Sending message with conversationId:', conversationId);
      
      handleMessageSubmit?.(message);
      handleTyping(false);
      
      try {
        await sendMessageMutation.mutateAsync(message);
        input.value = '';
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  return {
    sendMessage: (content: MessageContent) => sendMessageMutation.mutateAsync(content),
    deleteMessages: () => deleteMessagesMutation.mutateAsync(),
    handleSubmit,
    handleTyping,
    isLoading: sendMessageMutation.isPending,
    isDeleting: deleteMessagesMutation.isPending,
    error: sendMessageMutation.error,
    deleteError: deleteMessagesMutation.error,
  };
} 