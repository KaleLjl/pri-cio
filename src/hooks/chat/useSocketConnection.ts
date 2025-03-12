import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { socketService } from '@/lib/services/socket/socketService';

interface UseSocketConnectionProps {
  userId?: string;
  enabled?: boolean;
}

export function useSocketConnection({ userId, enabled = true }: UseSocketConnectionProps) {
  useEffect(() => {
    if (!enabled || !userId) return;

    // Initialize socket connection
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      auth: { userId },
      transports: ['websocket'],
      autoConnect: false
    });

    // Initialize socket service
    socketService.initialize(socket);

    // Connect to socket
    socket.connect();

    // Cleanup on unmount
  return () => {
      socketService.cleanup();
    };
  }, [userId, enabled]);

  return {
    isConnected: socketService.isConnected(),
    connect: socketService.connect,
    disconnect: socketService.disconnect,
    joinRoom: socketService.joinRoom,
    leaveRoom: socketService.leaveRoom,
    getActiveRooms: socketService.getActiveRooms,
    sendMessage: socketService.sendMessage,
    onNewMessage: socketService.onNewMessage,
    onUserTyping: socketService.onUserTyping,
    onMessageDelivered: socketService.onMessageDelivered,
    onMessageRead: socketService.onMessageRead
  };
} 