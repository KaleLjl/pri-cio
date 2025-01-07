import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { HistoryItem } from '@/lib/types/history';

export function usePublish() {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<string | null>(null);
  const [canPost, setCanPost] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Load saved location permission on mount
  useEffect(() => {
    const savedPermission = localStorage.getItem('locationPermission');
    if (savedPermission) {
      setLocationPermission(savedPermission);
    }
  }, []);

  const showNewToast = (message: string, type: 'success' | 'error' | 'info') => {
    setShowToast(false);
    setTimeout(() => {
      setToastMessage(message);
      setToastType(type);
      setShowToast(true);
    }, 100);
  };

  const postHistoryToExplore = async (history: HistoryItem) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }
    
    // 如果不能发布，显示提示并直接返回
    if (!canPost) {
      showNewToast('Please wait 5 seconds before posting again', 'info');
      return Promise.reject('Please wait before posting again');
    }

    // 立即禁用发布能力
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

      const response = await fetch('/api/publish', {
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to post history to explore');
      }

      showNewToast('Successfully posted to explore!', 'success');
    } catch (error) {
      console.error('Post history failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to post history');
      showNewToast(error instanceof Error ? error.message : 'Failed to post history', 'error');
      throw error;
    } finally {
      setIsSaving(false);
      // 5秒后重新启用发布能力
      setTimeout(() => {
        setCanPost(true);
      }, 5000);
    }
  };

  const handleLocationPermission = (permission: 'granted' | 'denied') => {
    localStorage.setItem('locationPermission', permission);
    setLocationPermission(permission);
  };

  return {
    postHistoryToExplore,
    isSaving,
    error,
    locationPermission,
    handleLocationPermission,
    canPost,
    showToast,
    setShowToast,
    toastMessage,
    setToastMessage,
    toastType,
    setToastType,
    showNewToast,
  };
} 