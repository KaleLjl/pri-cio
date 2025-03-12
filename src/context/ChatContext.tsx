'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatUser } from '@/lib/types/chat';
import { conversationApiService } from '@/lib/services/api/chat/conversationService';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { useQueryClient } from '@tanstack/react-query';

interface ChatContextValue {
  currentUserId: string | null;
  otherUser: ChatUser | null;
  conversationId: string;
  isInitializing: boolean;
  error: string | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
  userId: string;
  conversationId?: string;
}

export function ChatProvider({ children, userId, conversationId: initialConversationId }: ChatProviderProps) {
  const queryClient = useQueryClient();
  const [currentConversationId, setCurrentConversationId] = useState<string>(initialConversationId || '');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const initializeChat = async () => {
      if (!userId) return;
      
      try {
        setIsInitializing(true);
        setError(null);
        
        // Initialize conversation
        const result = await conversationApiService.initializeConversation(userId);
        
        if (!isMounted) return;
        
        if (!result?.conversationId) {
          throw new Error('Failed to get conversation ID');
        }

        if (!result?.otherUser || !result?.otherUser?._id) {
          throw new Error('Failed to get other user information');
        }

        // Use provided conversationId if available
        const finalConversationId = initialConversationId || result.conversationId;
        console.log('Setting conversationId in context:', finalConversationId);
        
        setCurrentConversationId(finalConversationId);
        setCurrentUserId(result.currentUserId);
        setOtherUser(result.otherUser);
        
        // Prefetch messages using cache service
        if (finalConversationId) {
          await chatCacheService.prefetchMessages(finalConversationId);
        }

      } catch (err) {
        if (isMounted) {
          console.error('Error initializing chat in context:', err);
          setError(err instanceof Error ? err.message : 'Failed to initialize chat');
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };
    
    initializeChat();
    
    return () => {
      isMounted = false;
    };
  }, [userId, initialConversationId, queryClient]);
  
  const value = {
    currentUserId,
    otherUser,
    conversationId: currentConversationId,
    isInitializing,
    error,
  };
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
} 