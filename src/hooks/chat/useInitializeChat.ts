import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChatUser } from '@/lib/types/chat';
import { useLanguage } from '@/context/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { conversationApiService } from '@/lib/services/api/chat/conversationService';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';

export interface UseInitializeChatProps {
  userId: string;
  conversationId?: string;
}

interface UseInitializeChatResult {
  currentUserId: string | null;
  otherUser: ChatUser | null;
  conversationId: string;
  isInitializing: boolean;
  error: string | null;
}

export function useInitializeChat({ userId, conversationId }: UseInitializeChatProps): UseInitializeChatResult {
  const { dict } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentConversationId, setCurrentConversationId] = useState<string>(conversationId || '');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  
  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);
  
  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (status !== 'authenticated' || !userId || hasInitialized.current) {
        return;
      }
      
      try {
        setIsInitializing(true);
        setError(null);
        hasInitialized.current = true;
        
        // Initialize conversation
        const result = await conversationApiService.initializeConversation(userId);
        console.log('Initialization result:', result);
        
        if (!result?.conversationId) {
          console.error('Missing conversationId in response:', result);
          throw new Error('Failed to get conversation ID');
        }

        // Use provided conversationId if available
        setCurrentConversationId(conversationId || result.conversationId);
        setCurrentUserId(result.currentUserId);
        setOtherUser(result.otherUser);
        
        // Prefetch messages using cache service
        if (result.conversationId) {
          await chatCacheService.prefetchMessages(result.conversationId);
        }

      } catch (err) {
        console.error('Error initializing chat:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
        hasInitialized.current = false; // Reset if there was an error
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeChat();
  }, [status, userId, conversationId, queryClient]);
  
  return {
    currentUserId,
    otherUser,
    conversationId: currentConversationId,
    isInitializing,
    error,
  };
} 