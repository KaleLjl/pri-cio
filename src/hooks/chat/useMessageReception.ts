import { useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { socketService } from '@/lib/services/socket/socketService';
import { messageApiService } from '@/lib/services/api/chat/messageService';
import { ChatMessage } from '@/lib/types/chat';

interface UseMessageReceptionProps {
  conversationId: string;
  currentUserId: string;
}

export function useMessageReception({ conversationId, currentUserId }: UseMessageReceptionProps) {
  const { onNewMessage, onMessageDelivered, onMessageRead, onUserTyping } = useSocket();
  const queryClient = useQueryClient();

  // Initialize cache service
  chatCacheService.initialize(queryClient);

  useEffect(() => {
    // Helper function to mark messages as read
    const markMessagesAsRead = () => {
      messageApiService.markAsRead(conversationId).catch(error => {
        console.error('Failed to mark messages as read:', error);
      });
    };

    // Handle messages and their status
    const handleMessageStatus = (messageId: string, status: 'delivered' | 'read') => {
      chatCacheService.updateMessageStatus(messageId, status);
      if (status === 'read') {
        markMessagesAsRead();
      }
    };

    // Handle new incoming messages and read status
    const messageCleanup = onNewMessage((message: ChatMessage) => {
      if (message.conversationId === conversationId) {
        // Update cache with new message
        chatCacheService.handleNewMessage(message);
        
        // If we're receiving the message, mark it as delivered and read
        if (message.senderId !== currentUserId) {
          socketService.sendMessageDelivered(message._id);
          handleMessageStatus(message._id, 'delivered');
          handleMessageStatus(message._id, 'read');
        }
      }
    });

    // Handle message read status updates
    const readCleanup = onMessageRead((messageId: string) => {
      handleMessageStatus(messageId, 'read');
    });

    // Handle typing status updates
    const typingCleanup = onUserTyping((data) => {
      if (data.userId !== currentUserId) {
        chatCacheService.updateTypingStatus(data.userId, data.typing);
      }
    });

    // Mark conversation as read when component mounts
    if (conversationId) {
      markMessagesAsRead();
    }

    // Cleanup all listeners when component unmounts
    return () => {
      messageCleanup();
      readCleanup();
      typingCleanup();
    };
  }, [conversationId, currentUserId, onNewMessage, onMessageDelivered, onMessageRead, onUserTyping]);

  // Return typing status update function
  return {
    sendTypingStatus: (isTyping: boolean) => {
      if (conversationId && currentUserId) {
        socketService.sendTyping({
          conversationId,
          userId: currentUserId,
          typing: isTyping
        });
      }
    }
  };
} 