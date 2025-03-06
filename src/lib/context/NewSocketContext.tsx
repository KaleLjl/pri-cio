"use client";

import React, { createContext, useContext, useMemo } from "react";
import { ChatMessage } from "@/lib/services/socket";
import { useSocketConnection } from "@/app/api/users/hooks/chat/socket/useSocketConnection";

// Define context type
interface SocketContextType {
  sendMessage: (message: ChatMessage) => void;
  sendTyping: (data: { conversationId: string; userId: string; typing: boolean }) => void;
  sendMessageRead: (messageId: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  updateMessageStatus: (
    messageId: string, 
    status: "sending" | "sent" | "delivered" | "read" | "error"
  ) => void;
  isConnected: boolean;
}

// Create context
const SocketContext = createContext<SocketContextType | null>(null);

/**
 * Custom hook to use the socket context
 */
export function useSocket() {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  
  return context;
}

/**
 * SocketProvider component
 * Uses hooks for socket and cache integration
 */
export function SocketProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  // Use our socket connection hook directly
  const {
    isConnected,
    sendMessage,
    sendTyping,
    updateMessageStatus,
    markConversationAsRead,
    socketService
  } = useSocketConnection(userId || null);

  // Prepare context value with all required methods
  const contextValue = useMemo(() => ({
    sendMessage,
    sendTyping,
    sendMessageRead: (messageId: string) => {
      socketService?.sendMessageRead(messageId);
    },
    joinRoom: (roomId: string) => {
      socketService?.joinRoom(roomId);
    },
    leaveRoom: (roomId: string) => {
      socketService?.leaveRoom(roomId);
    },
    updateMessageStatus,
    isConnected
  }), [
    sendMessage, 
    sendTyping, 
    socketService, 
    updateMessageStatus, 
    isConnected
  ]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
} 