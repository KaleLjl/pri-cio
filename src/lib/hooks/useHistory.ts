import { useSession } from 'next-auth/react';
import { useState } from 'react';

export const useHistory = () => {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const saveToHistory = async (price: string, description: string) => {
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
          userEmail: session.user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save history');
      }
      return await response.json();
    } catch (error) {
      console.error('Save history failed:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveToHistory,
    isSaving,
  };
};