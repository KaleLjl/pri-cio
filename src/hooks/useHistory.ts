import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { HistoryItem, DealingItem } from '@/lib/types/history';
import { socketService } from '@/lib/socket';

interface Profile {
  name: string;
  about: string;
  website: string;
  avatarUrl: string | null;
  updatedAt: Date;
}

export function useHistory(initialData: HistoryItem[] = []) {
  const { data: session } = useSession();
  const [histories, setHistories] = useState<HistoryItem[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('locationPermission');
    }
    return null;
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<Profile>({
    name: "",
    about: "",
    website: "",
    avatarUrl: null,
    updatedAt: new Date(),
  });

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

  const saveToHistory = async (price: string, description: string, images: { id: string; url: string; isPrimary: boolean; }[], currency: string) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price,
          description,
          images,
          currency,
          userEmail: session.user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save to history');
      }

      const newHistory = await response.json();
      setHistories(prev => [...prev, newHistory]);
      return newHistory;
    } catch (error) {
      console.error('Save to history failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to save to history');
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

  const handleLocationPermission = (permission: 'granted' | 'denied') => {
    localStorage.setItem('locationPermission', permission);
    setLocationPermission(permission);
  };

  return {
    histories,
    setHistories,
    isLoading,
    error,
    formData,
    deleteHistory,
    refreshHistories,
    saveToHistory,
    updateHistory,
    locationPermission,
    handleLocationPermission,
  };
}