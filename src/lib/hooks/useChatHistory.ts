import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ChatRecord {
  _id: string;
  participants: {
    _id: string;
    name: string;
    avatarUrl: string;
  }[];
  lastMessage?: {
    _id: string;
    content: string;
    createdAt: string;
    senderId: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UseChatHistoryReturn {
  chats: ChatRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: session } = useSession();

  const fetchChats = async () => {
    if (!session) {
      setChats([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      const data = await response.json();
      setChats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [session]);

  return {
    chats,
    loading,
    error,
    refetch: fetchChats
  };
} 