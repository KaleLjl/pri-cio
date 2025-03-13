import { useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '@/lib/services/socket/socketService';
import { ChatMessage } from '@/lib/types/chat';

export interface UseSocketConnectionProps {
  userId: string;
  conversationId: string;
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: ChatMessage) => void;
}

export function useSocketConnection({
  userId,
  conversationId,
  enabled = true,
  onConnect,
  onDisconnect,
  onMessage
}: UseSocketConnectionProps) {
  const setupEventHandlers = useCallback(() => {
    if (!enabled) return;

    const socket = socketService.socket as Socket;
    if (!socket) return;

    socket.on('connect', () => {
      console.log('[Socket] Connected');
      onConnect?.();
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      onDisconnect?.();
    });

    socket.on('message', (message: ChatMessage) => {
      console.log('[Socket] Received message:', message);
      onMessage?.(message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
    };
  }, [enabled, onConnect, onDisconnect, onMessage]);

  useEffect(() => {
    if (!enabled || !userId || !conversationId) {
      console.log('[Socket] Connection disabled or missing required params');
      return;
    }

    console.log('[Socket] Setting up connection for:', { userId, conversationId });
    socketService.connect(userId);
    
    // Join the conversation room after connection
    if (socketService.socket) {
      socketService.socket.emit('join', { conversationId });
    }
    
    const cleanup = setupEventHandlers();

    return () => {
      cleanup?.();
      socketService.disconnect();
    };
  }, [userId, conversationId, enabled, setupEventHandlers]);
} 