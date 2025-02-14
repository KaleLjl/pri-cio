import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageContent } from '@/lib/types/chat';
import { useContext } from 'react';
import { SocketContext } from '@/lib/context/SocketContext';

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
  const socket = useContext(SocketContext);

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

      const optimisticMessage: ChatMessage = {
        _id: uuidv4(),
        conversationId,
        content,
        senderId: currentUserId,
        receiverId: otherUserId,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      // 发送消息（SocketContext 会处理缓存更新）
      socket.sendMessage(optimisticMessage);

      return { optimisticMessage };
    },
    onSuccess: (newMessage, _, context) => {
      if (!context?.optimisticMessage) return;
      
      // 更新状态为已发送
      socket.updateMessageStatus(context.optimisticMessage._id, 'sent');
      
      // 不需要再次发送消息，因为服务器已经确认
    },
    onError: (error, _, context) => {
      if (!context?.optimisticMessage) return;

      // 更新错误状态
      socket.updateMessageStatus(context.optimisticMessage._id, 'error');
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