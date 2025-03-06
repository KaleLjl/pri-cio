'use client';

import { createContext, useContext, ReactNode } from 'react';
import { socketService } from '@/lib/services/socket/socketService';
import { ChatMessage, TypingData } from '@/lib/utils/socket/types';
import { useSocketConnection } from '@/hooks/chat/useSocketConnection';

interface SocketContextType {
  isConnected: boolean;
  connect: (userId: string) => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  getActiveRooms: () => string[];
  sendMessage: (message: ChatMessage) => boolean;
  sendTyping: (data: { conversationId: string; userId: string; typing: boolean }) => boolean;
  onNewMessage: (callback: (message: ChatMessage) => void) => () => void;
  onUserTyping: (callback: (data: TypingData) => void) => () => void;
  onMessageDelivered: (callback: (messageId: string) => void) => () => void;
  onMessageRead: (callback: (messageId: string) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
  userId?: string;
}

export const SocketProvider = ({ children, userId }: SocketProviderProps) => {
  const { isConnected } = useSocketConnection(userId);

  const value: SocketContextType = {
    isConnected,
    connect: socketService.connect,
    disconnect: socketService.disconnect,
    joinRoom: socketService.joinRoom,
    leaveRoom: socketService.leaveRoom,
    getActiveRooms: socketService.getActiveRooms,
    sendMessage: socketService.sendMessage,
    sendTyping: socketService.sendTyping,
    onNewMessage: socketService.onNewMessage,
    onUserTyping: socketService.onUserTyping,
    onMessageDelivered: socketService.onMessageDelivered,
    onMessageRead: socketService.onMessageRead,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
