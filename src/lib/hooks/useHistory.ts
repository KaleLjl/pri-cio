import { useState } from 'react';
import { useSession } from 'next-auth/react';

export interface HistoryItem {
  _id: string;
  imageUrl: string;
  price: string;
  description: string;
  createdAt: string;
  userEmail: string;
}
export function useHistory(initialData: HistoryItem[] = []) {
  const { data: session } = useSession();
  const [histories, setHistories] = useState<HistoryItem[]>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 保存到历史记录
  const saveToHistory = async (price: string, description: string, selectedImage: string) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price,
          description,
          selectedImage,
          userEmail: session.user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save history');
      }
      
      // 保存成功后刷新历史记录
      await refreshHistories();
      return await response.json();
    } catch (error) {
      console.error('Save history failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to save history');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // 刷新历史记录
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

  // 删除历史记录
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

      // 删除成功后更新列表
      setHistories(histories.filter(history => history._id !== historyId));
    } catch (error) {
      console.error('Delete history failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete history');
      throw error;
    }
  };

  // Post to explore
  const postHistory = async (history: HistoryItem) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }
  
    setIsSaving(true);
    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: history.price,
          description: history.description,
          imageUrl: history.imageUrl,
          userEmail: session.user.email,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to post history to explore');
      }
  
      console.log('History successfully posted to explore!');
    } catch (error) {
      console.error('Post history failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to post history');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };
  

  return {
    histories,
    isLoading,
    isSaving,
    error,
    saveToHistory,
    refreshHistories,
    deleteHistory,
    postHistory,
  };
}