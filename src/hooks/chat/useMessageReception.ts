import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { socketService } from '@/lib/services/socket/socketService';
import { messageApiService } from '@/lib/services/api/chat/messageApiService';
import { ChatMessage } from '@/lib/types/chat';

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

  useEffect(() => {
    if (!enabled || !conversationId || !currentUserId) return;

    // Join the conversation room
    socketService.joinRoom(conversationId);

    // Handle new incoming messages
    const messageCleanup = socketService.onNewMessage((message: ChatMessage) => {
      if (message.conversationId === conversationId) {
        // Update cache with new message
        chatCacheService.handleNewMessage(message);
        
        // If we're receiving the message, mark it as delivered and read
        if (message.senderId !== currentUserId) {
          socketService.sendMessageDelivered(message._id);
          chatCacheService.handleMessageStatusSequence(message._id, ['delivered', 'read']);
          
          // Also mark as read on the server
          messageApiService.markAsRead(conversationId).catch(error => {
            console.error('Failed to mark messages as read:', error);
          });
        }
      }
    });

    // Handle message read status updates
    const readCleanup = socketService.onMessageRead((messageId: string) => {
      chatCacheService.updateMessageStatus(messageId, 'read');
    });

    // Handle typing status updates
    const typingCleanup = socketService.onUserTyping((data) => {
      if (data.userId !== currentUserId) {
        chatCacheService.updateTypingStatus(data.userId, data.typing);
      }
    });

    // Mark conversation as read when component mounts
    messageApiService.markAsRead(conversationId).catch(error => {
      console.error('Failed to mark messages as read:', error);
    });

    // Cleanup all listeners when component unmounts
    return () => {
      messageCleanup();
      readCleanup();
      typingCleanup();
      socketService.leaveRoom(conversationId);
    };
  }, [conversationId, currentUserId, enabled, queryClient]);

  // Return typing status update function
  return {
    sendTypingStatus: (isTyping: boolean) => {
      if (conversationId && currentUserId) {
        socketService.handleTypingStatus({
          conversationId,
          userId: currentUserId,
          typing: isTyping
        });
      }
    }
  };
} 