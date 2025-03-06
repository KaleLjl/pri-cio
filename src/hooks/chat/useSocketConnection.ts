import { useState, useEffect } from 'react';
import { socketService } from '@/lib/services/socket/socketService';

export const useSocketConnection = (userId?: string) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) {
      console.log('No userId provided, skipping socket connection');
      return;
    }

    console.log(`Initializing socket connection for user: ${userId}`);
    socketService.connect(userId);

    const handleConnect = () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log(`Socket disconnected: ${reason}`);
      setIsConnected(false);
    };

    socketService.onConnect(handleConnect);
    socketService.onDisconnect(handleDisconnect);

    return () => {
      console.log('Cleaning up socket connection');
      socketService.disconnect();
    };
  }, [userId]);

  return { isConnected };
}; 