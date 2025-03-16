import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChatUser } from '@/lib/types/chat';
import { useQueryClient } from '@tanstack/react-query';

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string>('');
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

        // Create or get conversation
        const response = await fetch('/api/chat/conversations/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch chat data');
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

        // Update chat history cache
        queryClient.setQueryData(['chat-history'], (oldChats: any[] = []) => {
          // Check if chat already exists
          const chatExists = oldChats.some(chat => chat._id === data._id);
          if (chatExists) {
            return oldChats;
          }

          // Add new chat
          const newChat = {
            _id: data._id,
            participants: data.participants,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            unreadCount: 0
          };

          return [newChat, ...oldChats];
        });

      } catch (error) {
        console.error('Error initializing chat:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch chat data');
        hasInitialized.current = false;  // Reset if there was an error
      } finally {
        setIsInitializing(false);
      }
    };

    if (userId) {
      initializeChat();
    }
  }, [userId, status, session?.user?.name, queryClient]);

  return {
    currentUserId,
    otherUser,
    conversationId,
    isInitializing,
    error,
  };
} 