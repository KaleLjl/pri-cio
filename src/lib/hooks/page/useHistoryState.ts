import { useState } from 'react';
import { HistoryItem } from '@/lib/types/history';
import { useHistoryData } from '../server/useHistoryData';

export function useHistoryState(initialData: HistoryItem[] = []) {
  const [histories, setHistories] = useState<HistoryItem[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { deleteFromHistory, fetchHistories } = useHistoryData();

  const deleteHistory = async (historyId: string) => {
    try {
      await deleteFromHistory(historyId);
      setHistories(prev => prev.filter(history => history._id !== historyId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete history');
      throw error;
    }
  };

  const refreshHistories = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHistories();
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