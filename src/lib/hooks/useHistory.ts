import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { HistoryItem } from '@/lib/types/history';

export function useHistory(initialData: HistoryItem[] = []) {
  const { data: session } = useSession();
  const [histories, setHistories] = useState<HistoryItem[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('locationPermission');
    }
    return null;
  });
  const [canPost, setCanPost] = useState(true);

  const deleteHistory = async (historyId: string) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`/api/history/${historyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete history');
      }

      setHistories(prev => prev.filter(history => history._id !== historyId));
      return { success: true };
    } catch (error) {
      console.error('Delete history failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete history');
      throw error;
    }
  };

  const saveToHistory = async (price: string, description: string, imageUrl: string) => {
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
          imageUrl,
          userEmail: session.user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save to history');
      }

      const newHistory = await response.json();
      setHistories(prev => [...prev, newHistory]);
      return newHistory;
    } finally {
      setIsSaving(false);
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

  const updateHistory = async (historyId: string, updates: { price?: string; description?: string }) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`/api/history/${historyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update history');
      }

      setHistories(prev => prev.map(history => 
        history._id === historyId ? { ...history, ...updates } : history
      ));
      
      return { success: true };
    } catch (error) {
      console.error('Update history failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to update history');
      throw error;
    }
  };

  const postHistoryToExplore = async (history: HistoryItem & { location?: { latitude: number; longitude: number } }) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    if (history.exploreId) {
      throw new Error('This item has already been published');
    }
    
    if (!canPost) {
      throw new Error('Please wait 5 seconds before posting again');
    }

    setCanPost(false);
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
          location: history.location, // Pass location directly
          historyId: history._id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to post history to explore');
      }

      const data = await response.json();
      
      setHistories(prev => 
        prev.map(h => 
          h._id === history._id 
            ? { ...h, exploreId: data._id.toString() } 
            : h
        )
      );
      
      return { success: true };
    } catch (error) {
      console.error('Post history failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to post history');
      throw error;
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setCanPost(true);
      }, 5000);
    }
  };

  const unpublishHistory = async (historyId: string, exploreId: string) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`/api/explore?historyId=${historyId}&exploreId=${exploreId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to unpublish');
      }
      
      setHistories(prev => 
        prev.map(h => 
          h._id === historyId 
            ? { ...h, exploreId: undefined } 
            : h
        )
      );
      
      return { success: true };
    } catch (error) {
      console.error('Unpublish failed:', error);
      throw error;
    }
  };

  const handleLocationPermission = (permission: 'granted' | 'denied') => {
    localStorage.setItem('locationPermission', permission);
    setLocationPermission(permission);
  };

  return {
    histories,
    setHistories,
    isLoading,
    isSaving,
    error,
    deleteHistory,
    refreshHistories,
    saveToHistory,
    updateHistory,
    postHistoryToExplore,
    unpublishHistory,
    locationPermission,
    handleLocationPermission,
    canPost,
  };
}