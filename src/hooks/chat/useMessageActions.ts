import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageContent } from '@/lib/types/chat';
import { messageApiService } from '@/lib/services/api/chat/messageApiService';
import { socketService } from '@/lib/services/socket/socketService';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { useRef, useEffect, useCallback } from 'react';

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
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize cache service
  chatCacheService.initialize(queryClient);

  // Validate IDs
  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      console.warn('Missing user IDs:', { currentUserId, otherUserId });
      return;
    }

    if (currentUserId === otherUserId) {
      console.error('Invalid user configuration: Cannot send message to self', {
        currentUserId,
        otherUserId
      });
    }
  }, [currentUserId, otherUserId]);

  // Handle typing status with error handling
  const handleTyping = useCallback((typing: boolean) => {
    if (!conversationId || !currentUserId) {
      console.warn('Cannot send typing status: Missing IDs');
      return;
    }

    if (!socketService.isConnected()) {
      console.warn('Cannot send typing status: Socket not connected');
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      socketService.handleTypingStatus({
        conversationId,
        userId: currentUserId,
        typing,
      });

      if (typing) {
        typingTimeoutRef.current = setTimeout(() => {
          try {
            socketService.handleTypingStatus({
              conversationId,
              userId: currentUserId,
              typing: false,
            });
          } catch (error) {
            console.error('Error sending typing status:', error);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error handling typing status:', error);
    }
  }, [conversationId, currentUserId]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: MessageContent) => {
      if (!conversationId) {
        console.log('[Chat] Error: Missing conversation ID');
        throw new Error('Missing conversation ID');
      }
      
      if (!currentUserId) {
        console.log('[Chat] Error: Missing current user ID');
        throw new Error('Missing current user ID');
      }
      
      if (!otherUserId) {
        console.log('[Chat] Error: Missing recipient user ID');
        throw new Error('Missing recipient user ID');
      }

      if (currentUserId === otherUserId) {
        console.error('[Chat] Error: Attempted to send message to self:', {
          currentUserId,
          otherUserId,
          conversationId
        });
        throw new Error('Cannot send message to yourself');
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

      // Log message details for debugging
      console.log('[Chat] Preparing to send message:', {
        messageId: optimisticMessage._id,
        conversationId,
        senderId: currentUserId,
        receiverId: otherUserId,
        socketConnected: socketService.isConnected()
      });

      try {
        console.log('[Chat] Step 1: Updating cache with optimistic message');
        await chatCacheService.handleMessageSubmission(optimisticMessage);

        // Step 2: Send via socket if connected
        if (isConnected) {
          try {
            console.log('[Chat] Step 2: Sending message via socket');
            socketService.sendMessage(optimisticMessage);
            console.log('[Chat] Message sent via socket successfully');
          } catch (error) {
            console.error('[Chat] Failed to send message via socket:', error);
          }
        } else {
          console.log('[Chat] Socket not connected, skipping socket send');
        }

        // Step 3: Send via API
        console.log('[Chat] Step 3: Sending message via API');
        const sentMessage = await messageApiService.sendMessage(conversationId, content, otherUserId);
        console.log('[Chat] Message sent via API successfully:', sentMessage._id);

        // Step 4: Update message status in cache
        console.log('[Chat] Step 4: Updating cache with sent message');
        await chatCacheService.handleMessageSendSuccess(optimisticMessage, sentMessage);

        // Step 5: Retry socket send if it wasn't connected initially
        if (!isConnected && socketService.isConnected()) {
          try {
            console.log('[Chat] Step 5: Retrying socket send after API success');
            socketService.sendMessage(sentMessage);
            console.log('[Chat] Retry socket send successful');
          } catch (error) {
            console.error('[Chat] Failed to retry message via socket:', error);
          }
        }

        return { sentMessage, optimisticMessage };
      } catch (error) {
        console.error('[Chat] Error in message sending process:', error);
        throw error;
      }
    },
    onError: async (error, content, context: MutationContext | undefined) => {
      console.error('[Chat] Failed to send message:', error);
      
      if (context?.optimisticMessage) {
        console.log('[Chat] Handling message send failure in cache');
        await chatCacheService.handleMessageSendFailure(context.optimisticMessage._id);
      }

      // Set up retry mechanism for socket send
      if (!socketService.isConnected()) {
        console.log('[Chat] Setting up socket retry mechanism');
        retryTimeoutRef.current = setTimeout(() => {
          if (socketService.isConnected() && context?.optimisticMessage) {
            try {
              console.log('[Chat] Retrying message send via socket');
              socketService.sendMessage(context.optimisticMessage);
              console.log('[Chat] Socket retry successful');
            } catch (retryError) {
              console.error('[Chat] Failed to retry message via socket:', retryError);
            }
          }
        }, 2000);
      }
    }
  });

  // Delete messages mutation with error handling
  const deleteMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) {
        throw new Error('No conversation ID');
      }

      try {
        // Step 1: Delete via API
        await messageApiService.deleteMessages(conversationId);

        // Step 2: Clear cache
        await chatCacheService.clearConversationMessages(conversationId);

        // Step 3: Notify via socket if connected
        if (socketService.isConnected()) {
          try {
            socketService.leaveRoom(conversationId);
          } catch (error) {
            console.error('Error leaving room:', error);
          }
        }
      } catch (error) {
        console.error('Error deleting messages:', error);
        throw error;
      }
    }
  });

  // Handle form submission with error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.currentTarget as HTMLFormElement).querySelector('input[type="text"]') as HTMLInputElement;
    const message = input?.value.trim();
    
    if (message) {
      try {
        // Log the conversationId for debugging
        console.log('Sending message with conversationId:', conversationId);
        
        handleMessageSubmit?.(message);
        handleTyping(false);
        
        await sendMessageMutation.mutateAsync(message);
        input.value = '';
      } catch (error) {
        console.error('Error in form submission:', error);
        // Don't clear input on error so user can retry
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