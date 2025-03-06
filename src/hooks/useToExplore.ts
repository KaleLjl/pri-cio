import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { socketService } from '@/lib/socket';
import { HistoryItem } from '@/lib/types/history';

interface LocationState {
  inputAddress: string;
  inputCoordinates: { lat: number; lng: number } | null;
  isFetchingLocation: boolean;
  errorMessage: string;
  enableLocation: boolean;
}

export function useToExplore() {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canPost, setCanPost] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // 地址相关状态
  const [locationState, setLocationState] = useState<LocationState>({
    inputAddress: '',
    inputCoordinates: null,
    isFetchingLocation: false,
    errorMessage: '',
    enableLocation: false,
  });

  const setInputAddress = (address: string) => {
    setLocationState(prev => ({ ...prev, inputAddress: address }));
  };

  const setInputCoordinates = (coordinates: { lat: number; lng: number } | null) => {
    setLocationState(prev => ({ ...prev, inputCoordinates: coordinates }));
  };

  const setIsFetchingLocation = (isFetching: boolean) => {
    setLocationState(prev => ({ ...prev, isFetchingLocation: isFetching }));
  };

  const setErrorMessage = (message: string) => {
    setLocationState(prev => ({ ...prev, errorMessage: message }));
  };

  const setEnableLocation = (enable: boolean) => {
    setLocationState(prev => ({ ...prev, enableLocation: enable }));
  };

  const handleUseCurrentLocation = async () => {
    if (navigator.geolocation) {
      setIsFetchingLocation(true);
      setErrorMessage('');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setInputCoordinates({ lat: latitude, lng: longitude });

          const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
          const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;
          try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
              setInputAddress(data.results[0].formatted);
            } else {
              setErrorMessage('Address not found');
            }
          } catch (error) {
            console.error('Error fetching address:', error);
            setErrorMessage('Failed to fetch address');
          } finally {
            setIsFetchingLocation(false);
          }
        },
        (error) => {
          console.error('Error fetching location:', error);
          setErrorMessage('Failed to fetch location. Please enter manually.');
          setIsFetchingLocation(false);
        }
      );
    } else {
      setErrorMessage('Geolocation is not supported by your browser.');
    }
  };

  const handleGeocodeInputLocation = async () => {
    if (!locationState.inputAddress.trim()) {
      setErrorMessage('Please enter a valid location name.');
      return;
    }

    setIsFetchingLocation(true);
    setErrorMessage('');
    const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(locationState.inputAddress)}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { formatted, geometry } = data.results[0];
        setInputAddress(formatted);
        setInputCoordinates({ lat: geometry.lat, lng: geometry.lng });
      } else {
        setErrorMessage('No results found for the entered location.');
      }
    } catch (error) {
      console.error('Error fetching geocode data:', error);
      setErrorMessage('Failed to fetch location data. Please try again.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const postToExplore = async (history: HistoryItem) => {
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
          location: history.location,
          historyId: history._id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to post to explore');
      }

      const data = await response.json();

      // Get current user's ID and emit socket event
      const userResponse = await fetch('/api/users/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        socketService.emitExplorePostsUpdate(userData._id);
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Post to explore failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to post to explore');
      throw error;
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setCanPost(true);
      }, 5000);
    }
  };

  const unpublishFromExplore = async (historyId: string, exploreId: string) => {
    if (!session?.user?.email) {
      throw new Error('User not authenticated');
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/explore?historyId=${historyId}&exploreId=${exploreId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to unpublish from explore');
      }

      // Get current user's ID and emit socket event
      const userResponse = await fetch('/api/users/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        socketService.emitExplorePostsUpdate(userData._id);
      }

      return { success: true };
    } catch (error) {
      console.error('Unpublish failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to unpublish from explore');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = async (history: HistoryItem, onSuccess?: (data: any) => void) => {
    if (!locationState.inputCoordinates) {
      setErrorMessage('Please select or enter a valid location before confirming.');
      return;
    }

    try {
      const locationData = {
        latitude: locationState.inputCoordinates.lat,
        longitude: locationState.inputCoordinates.lng,
      };

      const result = await postToExplore({ ...history, location: locationData });
      setShowLocationModal(false);
      onSuccess?.(result);
    } catch (error) {
      // 错误已经在postToExplore中设置
    }
  };

  const handlePost = () => {
    setShowLocationModal(true);
  };

  return {
    postToExplore,
    unpublishFromExplore,
    isSaving,
    error,
    canPost,
    locationState,
    showLocationModal,
    setShowLocationModal,
    setInputAddress,
    setInputCoordinates,
    setIsFetchingLocation,
    setErrorMessage,
    setEnableLocation,
    handleUseCurrentLocation,
    handleGeocodeInputLocation,
    handleConfirm,
    handlePost,
  };
}
