import { useEffect, useCallback, useRef } from 'react';
import { SocketService } from '@/lib/services/socket';

interface UseSocketCoreProps {
  userId?: string | null;
}

/**
 * Core socket hook for initialization and room management
 */
export function useSocketCore({ userId }: UseSocketCoreProps) {
  const socketRef = useRef<SocketService | null>(null);
  const activeRoomsRef = useRef<Set<string>>(new Set());

  // Initialize socket service
  useEffect(() => {
    if (!userId) return;

    // Get socket instance
    const socketService = SocketService.getInstance();
    socketRef.current = socketService;

    // Connect if not already connected
    if (!socketService.isConnected()) {
      socketService.connect(userId);
    }

    // Cleanup on unmount
    return () => {
      // Only disconnect if this was the last socket user
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
      socketRef.current = null;
      activeRoomsRef.current.clear();
    };
  }, [userId]);

  // Join a room
  const joinRoom = useCallback((roomId: string) => {
    if (!socketRef.current || !roomId) return;
    
    socketRef.current.joinRoom(roomId);
    activeRoomsRef.current.add(roomId);
  }, []);

  // Leave a room
  const leaveRoom = useCallback((roomId: string) => {
    if (!socketRef.current || !roomId) return;
    
    socketRef.current.leaveRoom(roomId);
    activeRoomsRef.current.delete(roomId);
  }, []);

  // Get active rooms
  const getActiveRooms = useCallback(() => {
    return Array.from(activeRoomsRef.current);
  }, []);

  return {
    socketService: socketRef.current,
    joinRoom,
    leaveRoom,
    getActiveRooms,
    isConnected: socketRef.current?.isConnected() || false
  };
} 