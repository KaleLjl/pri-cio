import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { HistoryItem } from '@/lib/types/history';

export function usePostToExplore() {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postHistoryToExplore = async (history: HistoryItem & { location?: { latitude: number; longitude: number } }) => {
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
          location: history.location || null,
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
    postHistoryToExplore,
    isSaving,
    error,
  };
} 