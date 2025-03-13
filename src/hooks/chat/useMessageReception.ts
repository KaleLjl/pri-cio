import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { socketService } from '@/lib/services/socket/socketService';
import { messageApiService } from '@/lib/services/api/chat/messageApiService';
import { ChatMessage } from '@/lib/types/chat';
import { useSocketConnection } from './useSocketConnection';

// #region Types
interface UseMessageReceptionProps {
  conversationId: string;
  currentUserId: string;
  enabled?: boolean;
}
// #endregion Types

export function useMessageReception({ 
  conversationId, 
  currentUserId,
  enabled = true 
}: UseMessageReceptionProps) {
  const queryClient = useQueryClient();
  chatCacheService.initialize(queryClient);

  // Get historical messages using the cache client (when scrolling up)
  const historyMessages = chatCacheService.client?.handleGetHistoryMessage(conversationId, enabled);
  if (!historyMessages) {
    throw new Error('Cache service not initialized');
  }

  // # The function that would markMessageAsRead
  const markMessagesAsRead = useCallback(async () => {
    try {
      console.log('[Chat] Marking messages as read for conversation:', conversationId);
      await messageApiService.markAsRead(conversationId);
      console.log('[Chat] Messages marked as read successfully');
    } catch (error) {
      console.error('[Chat] Failed to mark messages as read:', error);
    }
  }, [conversationId]);

  // #region Socket Message Handlers
  const handleNewMessage = useCallback(async (message: ChatMessage) => {
    if (!message._id || !message.conversationId) {
      console.error('[Chat] Invalid message format received:', message);
      return;
    }

    const isForCurrentConversation = message.conversationId === conversationId;
    if (!isForCurrentConversation) {
      console.log('[Chat] Ignoring message - different conversation');
      try {
        await chatCacheService.handleNewConversation(message.conversationId);
      } catch (error) {
        console.error('[Chat] Error handling new conversation:', error);
      }
      return;
    }

    try {
      await chatCacheService.handleNewMessage(message);
      console.log('[Chat] Cache successfully updated with new message');
      
      if (message.senderId !== currentUserId) {
        console.log('[Chat] Marking received message as delivered');
        socketService.sendMessageDelivered(message._id);
        await markMessagesAsRead();
      }
    } catch (error) {
      console.error('[Chat] Error handling new message:', error);
    }
  }, [conversationId, currentUserId, markMessagesAsRead]);

  // #region Socket Connection
  const handleConnect = useCallback(() => {
    markMessagesAsRead();
  }, [markMessagesAsRead]);

  useSocketConnection({
    userId: currentUserId,
    conversationId,
    enabled: enabled && !!currentUserId && !!conversationId,
    onConnect: handleConnect,
    onMessage: handleNewMessage
  });
  // #endregion Socket Connection

  // #region Hook Return Value
  return {
    ...historyMessages
  };
  // #endregion Hook Return Value
} 