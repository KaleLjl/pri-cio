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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('locationPermission');
    }
    return null;
  });
  const [canPost, setCanPost] = useState(true);
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

    // Validate images
    if (!history.images || history.images.length === 0) {
      throw new Error('At least one image is required');
    }

    // Ensure there is a primary image
    const hasPrimaryImage = history.images.some(img => img.isPrimary);
    if (!hasPrimaryImage) {
      throw new Error('A primary image must be selected');
    }

    setCanPost(false);
    setIsSaving(true);

    try {
      // If location is provided, try to get city and country using OpenCage API
      let enrichedLocation = history.location;
      if (history.location) {
        try {
          const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${history.location.latitude}+${history.location.longitude}&key=${apiKey}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data?.results?.[0]?.components) {
              const components = data.results[0].components;
              enrichedLocation = {
                ...history.location,
                city: components.city || components.town || components.village || components.suburb,
                country: components.country
              };
            }
          }
        } catch (error) {
          console.error('Failed to enrich location data:', error);
          // Continue with original location if enrichment fails
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
          images: history.images,
          userEmail: session.user.email,
          currency: history.currency,
          location: enrichedLocation,
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

      // Get current user's ID and emit socket event
      const userResponse = await fetch('/api/users/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        socketService.emitExplorePostsUpdate(userData._id);
      }
      
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
      setIsSaving(true);
      const response = await fetch(`/api/explore?historyId=${historyId}&exploreId=${exploreId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to unpublish history');
      }

      setHistories(prev =>
        prev.map(h =>
          h._id === historyId
            ? { ...h, exploreId: undefined }
            : h
        )
      );

      // Get current user's ID and emit socket event
      const userResponse = await fetch('/api/users/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        socketService.emitExplorePostsUpdate(userData._id);
      }

    } catch (error) {
      console.error('Unpublish failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to unpublish history');
      throw error;
    } finally {
      setIsSaving(false);
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
    formData,
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