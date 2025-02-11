import { useCallback, useRef } from 'react';
import { useContext } from 'react';
import { SocketContext } from '@/lib/context/SocketContext';
import { ChatMessage } from '@/lib/types/chat';

interface UseSocketChatProps {
  conversationId?: string;
  currentUserId?: string;
  otherUserId?: string;
}

export function useSocketChat({ conversationId, currentUserId }: UseSocketChatProps) {
  const socket = useContext(SocketContext);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // 处理输入状态
  const handleTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId || !currentUserId) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      socket.sendTyping({
        conversationId,
        userId: currentUserId,
        typing,
      });

      if (typing) {
        typingTimeoutRef.current = setTimeout(() => {
          socket.sendTyping({
            conversationId,
            userId: currentUserId,
            typing: false,
          });
        }, 3000);
      }
    },
    [conversationId, currentUserId, socket]
  );

  // 发送消息
  const sendMessage = useCallback(
    (message: ChatMessage) => {
      socket.sendMessage(message);
    },
    [socket]
  );

  return {
    handleTyping,
    sendMessage,
  };
} 