import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { HistoryItem } from '@/lib/types/history';

export function usePublish(setHistories: React.Dispatch<React.SetStateAction<HistoryItem[]>>) {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('locationPermission');
    }
    return null;
  });
  const [canPost, setCanPost] = useState(true);

  const postHistoryToExplore = async (history: HistoryItem) => {
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
      let locationData = null;
      if (locationPermission === 'granted') {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (error) {
          console.warn('Failed to get location:', error);
        }
      }

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
          location: locationData,
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
    postHistoryToExplore,
    unpublishHistory,
    isSaving,
    error,
    locationPermission,
    handleLocationPermission,
    canPost,
  };
} 