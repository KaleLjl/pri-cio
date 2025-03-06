import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageContent } from '@/lib/types/chat';
import { messageApiService } from '@/lib/services/api/chat/messageService';
import { socketService } from '@/lib/services/socket/socketService';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { useSocket } from '@/context/SocketContext';

interface UseMessageActionsProps {
  conversationId?: string;
  currentUserId?: string;
  otherUserId?: string;
  handleMessageSubmit: (message: string) => void;
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
  const { isConnected } = useSocket();

  // Initialize cache service
  chatCacheService.initialize(queryClient);

  

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: MessageContent) => {
      if (!conversationId || !otherUserId || !currentUserId) {
        throw new Error('Missing required data');
      }
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
      await chatCacheService.handleOptimisticMessage(optimisticMessage);

      // Step 2: Send via socket if connected
      if (isConnected) {
        socketService.sendMessage(optimisticMessage);
      }

      // Step 3: Send via API
      const sentMessage = await messageApiService.sendMessage(conversationId, content, otherUserId);

      // Step 4: Update message status in cache
      await chatCacheService.updateMessageStatus(optimisticMessage._id, 'sent', sentMessage);

      return { sentMessage, optimisticMessage };
    },
    onError: async (error, content, context: MutationContext | undefined) => {
      console.error('Failed to send message:', error);
      
      if (context?.optimisticMessage) {
        // Update message status to failed in cache
        await chatCacheService.updateMessageStatus(context.optimisticMessage._id, 'failed');
      }

      // Invalidate queries to refresh the UI
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
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
      queryClient.removeQueries({ queryKey: ['chat-messages', conversationId] });

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
      handleMessageSubmit(message);
      await sendMessageMutation.mutateAsync(message);
      input.value = '';
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