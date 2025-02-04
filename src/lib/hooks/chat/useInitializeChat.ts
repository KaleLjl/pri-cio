import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChatUser } from '@/lib/types/chat';
import { useLanguage } from '@/lib/context/LanguageContext';
import { useChatData } from './useChatData';

interface UseInitializeChatProps {
  userId: string;
}

interface UseInitializeChatResult {
  currentUserId: string;
  otherUser: ChatUser | null;
  conversationId: string;
  isInitializing: boolean;
  error: string | null;
}

export function useInitializeChat({ userId }: UseInitializeChatProps): UseInitializeChatResult {
  const { dict } = useLanguage();
  const { status } = useSession();
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Use the chat data hook
  const { currentUser, otherUserData, userError } = useChatData({ userId });

  // 身份验证检查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (status !== 'authenticated') return;
      
      try {
        // Create or get conversation
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            participantId: userId,
            limit: 20,
            offset: 0
          }),
        });

        if (!response.ok) {
          throw new Error(dict.chat.error.fetch);
        }

        const data = await response.json();
        setConversationId(data._id);
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    if (userId) {
      initializeChat();
    }
  }, [userId, status, dict.chat.error.fetch]);

  return {
    currentUserId: currentUser?._id || '',
    otherUser: otherUserData,
    conversationId,
    isInitializing,
    error: userError,
  };
} 