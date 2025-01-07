import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { HistoryItem } from '@/lib/types/history';

export function useHistory(initialData: HistoryItem[] = []) {
  const { data: session } = useSession();
  const [histories, setHistories] = useState<HistoryItem[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteHistory = async (historyId: string) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`/api/history/${historyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete history');
      }

      setHistories(histories.filter(history => history._id !== historyId));
    } catch (error) {
      console.error('Delete history failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete history');
      throw error;
    }
  };

  const refreshHistories = async () => {
    if (!session?.user?.email) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    histories,
    setHistories,
    isLoading,
    error,
    deleteHistory,
    refreshHistories,
  };
}