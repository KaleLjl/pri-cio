import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChatUser } from '@/lib/types/chat';
import { useLanguage } from '@/lib/context/LanguageContext';

interface UseInitializeChatProps {
  userId: string;
}

interface UseInitializeChatResult {
  currentUserId: string | null;
  otherUser: ChatUser | null;
  conversationId: string;
  isInitializing: boolean;
  error: string | null;
}

export function useInitializeChat({ userId }: UseInitializeChatProps): UseInitializeChatResult {
  const { dict } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 身份验证检查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (status !== 'authenticated' || !userId) return;
      
      try {
        setIsInitializing(true);
        setError(null);

        // Create or get conversation
        const response = await fetch('/api/chat/conversations/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || dict.chat.error.fetch);
        }

        const data = await response.json();
        
        // Set conversation data
        setConversationId(data._id);
        
        // Find and set current user and other user from participants
        const currentUserData = data.participants.find(
          (p: ChatUser) => p.name === session?.user?.name
        );
        const otherUserData = data.participants.find(
          (p: ChatUser) => p.name !== session?.user?.name
        );

        if (currentUserData) {
          setCurrentUserId(currentUserData._id);
        }

        if (otherUserData) {
          setOtherUser(otherUserData);
        }

      } catch (error) {
        console.error('Error initializing chat:', error);
        setError(error instanceof Error ? error.message : dict.chat.error.fetch);
      } finally {
        setIsInitializing(false);
      }
    };

    if (userId) {
      initializeChat();
    }
  }, [userId, status, session?.user?.name, dict.chat.error.fetch]);

  return {
    currentUserId,
    otherUser,
    conversationId,
    isInitializing,
    error,
  };
} 