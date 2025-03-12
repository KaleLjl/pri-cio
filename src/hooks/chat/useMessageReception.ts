import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { socketService } from '@/lib/services/socket/socketService';
import { messageApiService } from '@/lib/services/api/chat/messageApiService';
import { ChatMessage, TypingData } from '@/lib/types/chat';
import { CacheKeys } from '@/lib/utils/cache/types';

interface UseMessageReceptionProps {
  conversationId: string;
  currentUserId: string;
  enabled?: boolean;
}

export function useMessageReception({ 
  conversationId, 
  currentUserId,
  enabled = true 
}: UseMessageReceptionProps) {
  const queryClient = useQueryClient();

  // Initialize cache service
  chatCacheService.initialize(queryClient);

  // Handle room joining with error handling
  const joinRoom = useCallback(async () => {
    if (!socketService.isConnected()) {
      console.log('[Chat] Cannot join room: Socket not connected');
      return false;
    }

    try {
      console.log('[Chat] Attempting to join room:', conversationId);
      socketService.joinRoom(conversationId);
      console.log('[Chat] Successfully joined room:', conversationId);
      return true;
    } catch (error) {
      console.error('[Chat] Failed to join room:', error);
      return false;
    }
  }, [conversationId]);

  // Handle message marking as read with error handling
  const markMessagesAsRead = useCallback(async () => {
    try {
      console.log('[Chat] Marking messages as read for conversation:', conversationId);
      await messageApiService.markAsRead(conversationId);
      console.log('[Chat] Messages marked as read successfully');
    } catch (error) {
      console.error('[Chat] Failed to mark messages as read:', error);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!enabled || !conversationId || !currentUserId) {
      console.log('[Chat] Message reception disabled or missing IDs:', {
        enabled,
        conversationId,
        currentUserId
      });
      return;
    }

    console.log('[Chat] Initializing message reception for conversation:', conversationId);
    let isActive = true;
    let reconnectionTimer: NodeJS.Timeout | null = null;

    // Check if socket is connected
    if (!socketService.isConnected()) {
      console.log('[Chat] Socket not connected, waiting for connection');
    } else {
      console.log('[Chat] Socket already connected, proceeding with room join');
      joinRoom();
    }

    // Setup connection status handler
    const connectionHandler = () => {
      if (isActive) {
        console.log('[Chat] Socket connected, joining room and marking messages');
        joinRoom();
        markMessagesAsRead();
      }
    };

    // Setup disconnection handler
    const disconnectionHandler = () => {
      if (isActive) {
        console.log('[Chat] Socket disconnected, setting up reconnection');
        // Try to rejoin room after a delay if disconnected
        reconnectionTimer = setTimeout(() => {
          if (socketService.isConnected()) {
            console.log('[Chat] Attempting to rejoin room after disconnection');
            joinRoom();
          }
        }, 2000);
      }
    };

    // Handle new incoming messages
    const messageCleanup = socketService.onNewMessage((message: ChatMessage) => {
      if (!isActive) {
        console.log('[Chat] Ignoring message - component inactive');
        return;
      }

      console.log('[Chat] New message received:', {
        messageId: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        timestamp: new Date().toISOString()
      });

      // Validate message format
      if (!message._id || !message.conversationId) {
        console.error('[Chat] Invalid message format received:', message);
        return;
      }

      // Check if message belongs to current conversation
      const isForCurrentConversation = message.conversationId === conversationId;
      console.log('[Chat] Message conversation check:', {
        messageConversationId: message.conversationId,
        currentConversationId: conversationId,
        isMatch: isForCurrentConversation
      });

      if (isForCurrentConversation) {
        try {
          // Update cache with new message
          console.log('[Chat] Updating cache with new message');
          chatCacheService.handleNewMessage(message)
            .then(() => {
              console.log('[Chat] Cache successfully updated with new message');
              
              // Force a re-render by invalidating the query
              queryClient.invalidateQueries({ 
                queryKey: [CacheKeys.CONVERSATION_MESSAGES, conversationId]
              });
              
              // If we're receiving the message, mark it as delivered and read
              if (message.senderId !== currentUserId) {
                console.log('[Chat] Marking received message as delivered and read');
                socketService.sendMessageDelivered(message._id);
                chatCacheService.handleMessageStatusSequence(message._id, ['delivered', 'read']);
                markMessagesAsRead();
              }
            })
            .catch(error => {
              console.error('[Chat] Failed to update cache with new message:', error);
            });
        } catch (error) {
          console.error('[Chat] Error handling new message:', error);
        }
      } else {
        console.log('[Chat] Ignoring message - different conversation');
        // Even though it's for a different conversation, we should still
        // update the chat history to show new message indicators
        try {
          chatCacheService.handleNewConversation(message.conversationId);
        } catch (error) {
          console.error('[Chat] Error handling new conversation:', error);
        }
      }
    });

    // Handle message read status updates
    const readCleanup = socketService.onMessageRead((messageId: string) => {
      if (!isActive) return;

      try {
        console.log('[Chat] Updating message read status:', messageId);
        chatCacheService.updateMessageStatus(messageId, 'read');
      } catch (error) {
        console.error('[Chat] Error handling message read status:', error);
      }
    });

    // Handle typing status updates
    const typingCleanup = socketService.onUserTyping((data: TypingData) => {
      if (!isActive) return;

      try {
        console.log('[Chat] Received typing status update:', {
          userId: data.userId,
          conversationId: data.conversationId,
          typing: data.typing
        });
        
        if (data.userId !== currentUserId) {
          chatCacheService.updateTypingStatus(data.userId, data.typing);
        }
      } catch (error) {
        console.error('[Chat] Error handling typing status:', error);
      }
    });

    // Set up connection event listeners
    console.log('[Chat] Setting up socket connection listeners');
    socketService.onConnect(connectionHandler);
    socketService.onDisconnect(disconnectionHandler);

    // Initial mark as read
    markMessagesAsRead();

    // Cleanup all listeners when component unmounts
    return () => {
      console.log('[Chat] Cleaning up message reception');
      isActive = false;
      if (reconnectionTimer) {
        clearTimeout(reconnectionTimer);
      }
      messageCleanup();
      readCleanup();
      typingCleanup();
      if (socketService.isConnected()) {
        console.log('[Chat] Leaving room:', conversationId);
        socketService.leaveRoom(conversationId);
      }
    };
  }, [conversationId, currentUserId, enabled, queryClient, joinRoom, markMessagesAsRead]);

  // Return typing status update function with error handling
  return {
    sendTypingStatus: (isTyping: boolean) => {
      if (!conversationId || !currentUserId) {
        console.warn('Cannot send typing status: Missing conversation or user ID');
        return;
      }

      if (!socketService.isConnected()) {
        console.warn('Cannot send typing status: Socket not connected');
        return;
      }

      try {
        socketService.handleTypingStatus({
          conversationId,
          userId: currentUserId,
          typing: isTyping
        });
      } catch (error) {
        console.error('Error sending typing status:', error);
      }
    }
  };
} 