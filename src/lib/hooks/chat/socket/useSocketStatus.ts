import { useCallback } from 'react';
import { MessageStatus } from '@/lib/services/socket';
import { useSocketCore } from './useSocketCore';

interface UseSocketStatusProps {
  userId?: string | null;
  conversationId?: string;
}

/**
 * Hook for managing message and conversation status updates
 */
export function useSocketStatus({ userId, conversationId }: UseSocketStatusProps) {
  const { socketService } = useSocketCore({ userId });

  // Mark message as delivered
  const markMessageDelivered = useCallback((messageId: string) => {
    if (!socketService) return;
    socketService.sendMessageDelivered(messageId);
  }, [socketService]);

  // Mark message as read
  const markMessageRead = useCallback((messageId: string) => {
    if (!socketService) return;
    socketService.sendMessageRead(messageId);
  }, [socketService]);

  // Listen for message status updates
  const onMessageStatusChange = useCallback((
    messageId: string,
    status: MessageStatus,
    callback: (messageId: string, status: MessageStatus) => void
  ) => {
    if (!socketService) return () => {};

    const cleanup1 = socketService.onMessageDelivered((id) => {
      if (id === messageId) {
        callback(id, 'delivered');
      }
    });

    const cleanup2 = socketService.onMessageRead((id) => {
      if (id === messageId) {
        callback(id, 'read');
      }
    });

    return () => {
      cleanup1();
      cleanup2();
    };
  }, [socketService]);

  return {
    markMessageDelivered,
    markMessageRead,
    onMessageStatusChange
  };
} 