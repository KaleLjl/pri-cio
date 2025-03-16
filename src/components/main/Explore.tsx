'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useExplore } from '@/lib/hooks/useExplore';
import { ExploreItem } from '@/lib/types/explore';
import { useSearchParams, useRouter } from 'next/navigation';
import { Switch as HeadlessSwitch } from '@headlessui/react';
import { Menu } from '@headlessui/react';
import { motion } from 'framer-motion';
import Modal from 'react-modal';
import { CURRENCIES } from '@/components/main/CreatePost';
import { useSession } from 'next-auth/react';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import Loading from '@/components/shared/Loading';
import ItemDetailModal from '@/components/shared/ItemDetailModal';

interface DisplayExploreProps {
  explores: ExploreItem[];
}

const RadiusDropdown = ({
  radius,
  setRadius
}: {
  radius: number;
  setRadius: (value: number) => void;
}) => {
  const options = [
    { value: 1, label: '1 km' },
    { value: 2, label: '2 km' },
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 20, label: '20 km' },
    { value: 40, label: '40 km' },
    { value: 60, label: '60 km' },
    { value: 80, label: '80 km' },
    { value: 100, label: '100 km' },
    { value: 250, label: '250 km' },
    { value: 500, label: '500 km' },
  ];

  return (
    <Menu as="div" className="relative inline-block w-full text-left">
      <div>
        <Menu.Button className="inline-flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-black bg-gray-100 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600">
          {options.find((option) => option.value === radius)?.label || 'Select Radius'}
          <svg
            className="w-5 h-5 ml-2 -mr-1 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586 
                 l3.293-3.293a1 1 0 111.414 1.414l-4 4 
                 a1 1 0 01-1.414 0l-4-4 a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </Menu.Button>
      </div>

      <Menu.Items className="absolute z-10 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg focus:outline-none">
        {options.map((option) => (
          <Menu.Item key={option.value}>
            {({ active }) => (
              <button
                onClick={() => setRadius(option.value)}
                className={`${
                  active ? 'bg-purple-600 text-white' : 'text-gray-900'
                } group flex rounded-md items-center w-full px-4 py-2 text-sm`}
              >
                {option.label}
              </button>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
};

export default function Explore({ explores: initialExplores }: DisplayExploreProps) {
  const { explores, isLoading, error } = useExplore(initialExplores);

  // Which card is open:
  const [selectedCard, setSelectedCard] = useState<ExploreItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('search') || '';
  const router = useRouter();
  const { data: session } = useSession();
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Radius & location states
  const [radiusModalOpen, setRadiusModalOpen] = useState(false);
  const [radius, setRadius] = useState<number>(10);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [enableLocation, setEnableLocation] = useState(false);
  const [noLimit, setNoLimit] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const [tempRadius, setTempRadius] = useState<number>(radius);
  const [tempEnableLocation, setTempEnableLocation] = useState<boolean>(enableLocation);
  const [tempNoLimit, setTempNoLimit] = useState<boolean>(noLimit);
  const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;

  // Get current user _id
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/users/me');
          if (response.ok) {
            const userData = await response.json();
            setCurrentUserId(userData._id);
          }
        } catch (error) {
          console.error('Error fetching current user:', error);
        }
      }
    };
    fetchCurrentUser();
  }, [session?.user?.email]);

  // Distance function
  const haversineDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const toRad = (v: number) => (v * Math.PI) / 180;
      const R = 6371; 
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },
    []
  );

  // Filter logic
  const filteredExplores = useMemo(() => {
    if (!explores) return [];
    let filtered = [...explores];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((explore) =>
        explore.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Location & radius
    if (!noLimit && enableLocation && userLocation) {
      filtered = filtered.filter((explore) => {
        if (!explore.location) return false;
        const distance = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          explore.location.latitude,
          explore.location.longitude
        );
        return distance <= radius;
      });
    }

    return filtered;
  }, [explores, searchQuery, noLimit, enableLocation, userLocation, radius, haversineDistance]);

  // Geolocation
  const handleGetUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        try {
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`
          );
          if (!response.ok) throw new Error(`API error: ${response.statusText}`);
          const data = await response.json();
          if (data?.results?.[0]?.formatted) {
            setLocationName(data.results[0].formatted);
          } else {
            setLocationName('Unknown Location');
          }
        } catch (err) {
          console.error('Error fetching location name:', err);
          setLocationName('Unknown Location');
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Failed to get your location.');
        setLocationName('Unknown Location');
      }
    );
  }, [apiKey]);

  // Directions
  const handleGetDirections = useCallback(
    (lat: number, lng: number) => {
      if (userLocation) {
        window.open(
          `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${lat},${lng}`,
          '_blank'
        );
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            window.open(
              `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${lat},${lng}`,
              '_blank'
            );
          },
          (err) => {
            console.error('Error fetching location:', err);
            alert('Please enable location services to get directions');
          }
        );
      } else {
        alert('Geolocation is not supported by this browser');
      }
    },
    [userLocation]
  );

  // Send message
  const handleSendMessageClick = useCallback(
    (userId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!userId) return;
      if (currentUserId === userId) return; // can't message yourself
      router.push(`/chat/${userId}`);
    },
    [router, currentUserId]
  );

  // Radius modal
  const handleApplyRadius = useCallback(() => {
    setEnableLocation(tempEnableLocation);
    setRadius(tempRadius);
    setRadiusModalOpen(false);
  }, [tempEnableLocation, tempRadius]);

  useEffect(() => {
    if (radiusModalOpen) {
      setTempRadius(radius);
      setTempEnableLocation(enableLocation);
    }
  }, [radiusModalOpen, radius, enableLocation]);

  // Avatar click
  const handleAvatarClick = useCallback(
    (userId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!userId) return;
      if (currentUserId === userId) return;
      router.push(`/chat/${userId}`);
    },
    [router, currentUserId]
  );

  // Open / close modal
  const openCardModal = useCallback((item: ExploreItem) => {
    setSelectedCard(item);
    setCurrentImageIndex(0);
  }, []);
  const handleNextImage = useCallback(() => {
    if (!selectedCard?.images) return;
    setCurrentImageIndex((prev) => (prev + 1) % selectedCard.images.length);
  }, [selectedCard]);
  const handlePrevImage = useCallback(() => {
    if (!selectedCard?.images) return;
    setCurrentImageIndex(
      (prev) => (prev - 1 + selectedCard.images.length) % selectedCard.images.length
    );
  }, [selectedCard]);

  // Rendering
  if (isLoading) {
    return <Loading text="Loading posts..." />;
  }
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-red-500">Error loading posts</h1>
        </div>
      </div>
    );
  }
  if (!isLoading && explores && explores.length > 0 && filteredExplores.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">No posts found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header spacer */}
      <div className="py-6 bg-black border-b border-gray-700" />

      {/* Set Radius Button */}
      <div className="absolute top-20 right-12 group z-10">
        <span
          onClick={() => setRadiusModalOpen(true)}
          className="px-4 py-2 text-white bg-transparent cursor-pointer rounded-full group-hover:bg-gray-800 transition-all duration-200"
        >
          Set Radius
        </span>
      </div>

      {/* Grid of items */}
      <div className="p-12 pt-20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {filteredExplores.map((explore) => {
          const coverImage = explore.images?.length
            ? (explore.images.find(img => img.isPrimary)?.url || explore.images[0]?.url)
            : '/fallback.jpg';
          return (
            <motion.div
              key={explore._id}
              whileHover={{ scale: 1.05 }}
              className="space-y-2 cursor-pointer"
              onClick={() => openCardModal(explore)}
            >
              <div className="rounded-[2rem] overflow-hidden shadow-md bg-gray-800">
                <div className="relative w-full h-[400px]">
                  <ImageWithFallback
                    src={coverImage}
                    alt={`Created at ${
                      explore.createdAt ? new Date(explore.createdAt).toLocaleString() : ''
                    }`}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="rounded-[2rem] object-cover"
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  {CURRENCIES.find((c) => c.value === explore.currency)?.symbol} {explore.price}
                </p>
                <p className="text-xs text-gray-400">
                  {explore.description || 'No description available'}
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  {explore.createdAt ? new Date(explore.createdAt).toLocaleString() : ''}
                </p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <div
                    className="relative w-6 h-6 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (explore.userProfile?._id) {
                        handleAvatarClick(explore.userProfile._id, e);
                      }
                    }}
                  >
                    <ImageWithFallback
                      src={explore.userProfile?.avatarUrl || ''}
                      alt={explore.userProfile?.name || 'Anonymous'}
                      layout="fill"
                      objectFit="cover"
                      isAvatar
                    />
                  </div>
                  <span className="text-xs text-gray-300">
                    {explore.userProfile?.name || 'Anonymous'}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Radius Modal */}
      <Modal
        isOpen={radiusModalOpen}
        onRequestClose={() => setRadiusModalOpen(false)}
        className="relative mx-auto w-full max-w-lg p-6 bg-white rounded-lg shadow-xl"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
        ariaHideApp={false}
      >
        <h2 className="text-black text-xl font-bold mb-4">Set Search Radius</h2>

        {/* Enable Location */}
        <div className="flex items-center justify-between mb-4">
          <label htmlFor="locationSwitch" className="mr-3 text-gray-600">
            Enable Location
          </label>
          <HeadlessSwitch
            checked={tempEnableLocation}
            onChange={(value) => {
              setTempEnableLocation(value);
              if (value) handleGetUserLocation();
            }}
            className={`${
              tempEnableLocation ? 'bg-purple-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span
              className={`${
                tempEnableLocation ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform bg-white rounded-full transition-transform`}
            />
          </HeadlessSwitch>
        </div>

        {tempEnableLocation && locationName && (
          <div className="mb-4 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700">
            Location: {locationName}
          </div>
        )}
      
        {/* No Limit */}
        <div className="flex items-center justify-between mb-4">
          <label htmlFor="noLimitSwitch" className="text-gray-600 mr-3">
            No Distance Limit
          </label>
          <HeadlessSwitch
            checked={tempNoLimit}
            onChange={(value) => {
              setTempNoLimit(value);
              if (value) {
                setTempEnableLocation(false);
                setTempRadius(0);
              }
            }}
            className={`${
              tempNoLimit ? 'bg-purple-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span
              className={`${
                tempNoLimit ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform bg-white rounded-full transition-transform`}
            />
          </HeadlessSwitch>
        </div>

        {tempEnableLocation && !tempNoLimit && (
          <RadiusDropdown radius={tempRadius} setRadius={setTempRadius} />
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleApplyRadius}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
          >
            Apply
          </button>
        </div>
      </Modal>

      {/* Post Modal */}
      {selectedCard && (
        <ItemDetailModal
          item={{
            _id: selectedCard._id,
            images: selectedCard.images,
            description: selectedCard.description,
            price: selectedCard.price,
            currency: selectedCard.currency,
            createdAt: selectedCard.createdAt,
            location: selectedCard.location,
            userProfile: selectedCard.userProfile,
            exploreId: selectedCard.historyId
          }}
          currentImageIndex={currentImageIndex}
          onClose={() => setSelectedCard(null)}
          onPrevImage={handlePrevImage}
          onNextImage={handleNextImage}
          onAvatarClick={handleAvatarClick}
          onSendMessage={handleSendMessageClick}
          onGetDirections={handleGetDirections}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
