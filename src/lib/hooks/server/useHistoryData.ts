import { useSession } from 'next-auth/react';
import { useState } from 'react';

export function useHistoryData() {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

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

      return response.json();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFromHistory = async (historyId: string) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`/api/history/${historyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete history');
    }

    return response.json();
  };

  const fetchHistories = async () => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/history');
    if (!response.ok) {
      throw new Error('Failed to fetch histories');
    }

    return response.json();
  };

  return {
    saveToHistory,
    deleteFromHistory,
    fetchHistories,
    isSaving,
  };
}