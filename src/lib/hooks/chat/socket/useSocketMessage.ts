import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/services/socket';
import { useSocketCore } from './useSocketCore';

interface UseSocketMessageProps {
  userId?: string | null;
  conversationId?: string;
}

/**
 * Hook for message operations (sending messages and typing status)
 * Handles pure socket operations without cache integration
 */
export function useSocketMessage({ userId, conversationId }: UseSocketMessageProps) {
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { socketService } = useSocketCore({ userId });

  // Clear typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Send a message
  const sendMessage = useCallback(async (
    content: string,
    receiverId: string
  ): Promise<string | null> => {
    if (!socketService || !userId || !conversationId) {
      console.error('Cannot send message: Missing required data');
      return null;
    }

    setIsSending(true);

    try {
      const messageId = Date.now().toString();
      const message: ChatMessage = {
        _id: messageId,
        conversationId,
        senderId: userId,
        receiverId,
        content,
        status: 'sending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = socketService.sendMessage(message);
      if (!success) {
        throw new Error('Failed to send message');
      }
      return messageId;
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    } finally {
      setIsSending(false);
      // Clear typing status after sending
      setIsTyping(false);
    }
  }, [socketService, userId, conversationId]);

  // Send typing status
  const sendTyping = useCallback((isCurrentlyTyping: boolean) => {
    if (!socketService || !userId || !conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsTyping(isCurrentlyTyping);
    socketService.sendTyping({
      conversationId,
      userId,
      typing: isCurrentlyTyping
    });

    // Set timeout to clear typing status
    if (isCurrentlyTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.sendTyping({
          conversationId,
          userId,
          typing: false
        });
      }, 2000); // 2 seconds timeout
    }
  }, [socketService, userId, conversationId]);

  // Listen for new messages
  const onNewMessage = useCallback((callback: (message: ChatMessage) => void) => {
    if (!socketService) return () => {};
    return socketService.onNewMessage(callback);
  }, [socketService]);

  return {
    sendMessage,
    sendTyping,
    onNewMessage,
    isSending,
    isTyping
  };
} 