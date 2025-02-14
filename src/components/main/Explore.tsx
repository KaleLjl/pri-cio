'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useExplore } from '@/lib/hooks/useExplore';
import { ExploreItem } from '@/lib/types/explore';
import { useSearchParams, useRouter } from 'next/navigation';
import { Switch as HeadlessSwitch } from '@headlessui/react';
import { Menu } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from 'react-modal';
import { CURRENCIES } from '@/components/main/App';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/lib/context/LanguageContext';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import Loading from '@/components/shared/Loading';

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
  const { dict } = useLanguage();
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
            alert(dict.around.enableLocation);
          }
        );
      } else {
        alert(dict.around.geolocationNotSupported);
      }
    },
    [userLocation, dict.around, setUserLocation]
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
    if (!selectedCard?.imageUrl) return;
    setCurrentImageIndex((prev) => (prev + 1) % selectedCard.imageUrl.length);
  }, [selectedCard]);
  const handlePrevImage = useCallback(() => {
    if (!selectedCard?.imageUrl) return;
    setCurrentImageIndex(
      (prev) => (prev - 1 + selectedCard.imageUrl.length) % selectedCard.imageUrl.length
    );
  }, [selectedCard]);

  // Rendering
  if (isLoading) {
    return <Loading />;
  }
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-red-500">{dict.explore.error}</h1>
        </div>
      </div>
    );
  }
  if (!isLoading && explores && explores.length > 0 && filteredExplores.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">{dict.explore.noPostsFound}</h1>
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
          {dict.explore.setRadius}
        </span>
      </div>

      {/* Grid of items */}
      <div className="p-12 pt-20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {filteredExplores.map((explore) => {
          const coverImage = explore.imageUrl?.length
            ? explore.imageUrl[0]
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
                    alt={`${dict.explore.createdAt} ${
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
                  {explore.description || dict.explore.noDescription}
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
                      alt={explore.userProfile?.name || dict.explore.anonymous}
                      layout="fill"
                      objectFit="cover"
                      isAvatar
                    />
                  </div>
                  <span className="text-xs text-gray-300">
                    {explore.userProfile?.name || dict.explore.anonymous}
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
        <h2 className="text-black text-xl font-bold mb-4">{dict.explore.radiusModalTitle}</h2>

        {/* Enable Location */}
        <div className="flex items-center justify-between mb-4">
          <label htmlFor="locationSwitch" className="mr-3 text-gray-600">
            {dict.explore.enableLocation}
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
            {dict.explore.locationLabel}: {locationName}
          </div>
        )}
      
        {/* No Limit */}
        <div className="flex items-center justify-between mb-4">
          <label htmlFor="noLimitSwitch" className="text-gray-600 mr-3">
            {dict.explore.noLimit}
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
            {dict.explore.apply}
          </button>
        </div>
      </Modal>

      {/* Post Modal */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-[90%] max-w-4xl p-8 text-black"
            >
              {/* Use CSS grid with 2 columns: 
                  left = 500x500 image area, right = auto for text */}
              <div className="grid" style={{ gridTemplateColumns: '500px auto', gap: '1.5rem' }}>
                
                {/* LEFT Column: 500x500 image, arrows inside */}
                <div className="relative w-[500px] h-[500px] bg-white rounded-lg overflow-hidden">
                  {selectedCard.imageUrl && selectedCard.imageUrl.length > 0 ? (
                    <>
                      <ImageWithFallback
                        src={selectedCard.imageUrl[currentImageIndex]}
                        alt={`${dict.explore.createdAt} ${
                          selectedCard.createdAt
                            ? new Date(selectedCard.createdAt).toLocaleString()
                            : ''
                        }`}
                        fill
                        style={{ objectFit: 'contain', backgroundColor: 'white' }}
                      />
                      {/* Arrows inside the image box */}
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/40 text-white p-2 rounded-r hover:bg-black/70"
                      >
                        ◀
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/40 text-white p-2 rounded-l hover:bg-black/70"
                      >
                        ▶
                      </button>
                    </>
                  ) : (
                    <div className="bg-gray-300 w-full h-full flex items-center justify-center">
                      No Images
                    </div>
                  )}
                </div>

                {/* RIGHT Column: details */}
                <div className="flex flex-col space-y-4 overflow-hidden">
                  {/* top row: avatar & name */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (selectedCard.userProfile?._id) {
                            handleAvatarClick(selectedCard.userProfile._id, e);
                          }
                        }}
                      >
                        <ImageWithFallback
                          src={selectedCard.userProfile?.avatarUrl || ''}
                          alt={selectedCard.userProfile?.name || dict.explore.anonymous}
                          layout="fill"
                          objectFit="cover"
                          isAvatar
                        />
                      </div>
                      <span className="font-semibold text-black">
                        {selectedCard.userProfile?.name || 'Anonymous'}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold">
                    {selectedCard.description || dict.explore.noDescription}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {dict.explore.createdAt}:
                    {' '}
                    {selectedCard.createdAt
                      ? new Date(selectedCard.createdAt).toLocaleString()
                      : ''}
                  </p>
                  <p className="text-lg font-semibold text-black">
                    {CURRENCIES.find((c) => c.value === selectedCard?.currency)?.symbol}{' '}
                    {selectedCard?.price || ''}
                  </p>
                  {selectedCard?.location && (
                    <p className="text-gray-600">
                      {dict.explore.locationLabel}: {selectedCard.location.city}, {selectedCard.location.country}
                    </p>
                  )}

                  <div className="flex-1" />

                  {/* Buttons at the bottom */}
                  {selectedCard.location && (
                    <div className="border-t border-gray-200 pt-4 flex items-center space-x-6">
                      {/* Directions */}
                      <button
                        onClick={() =>
                          selectedCard.location &&
                          handleGetDirections(selectedCard.location.latitude, selectedCard.location.longitude)
                        }
                        className="inline-flex items-center justify-center p-0 hover:bg-transparent"
                        aria-label="Get directions"
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-8 w-8 text-purple-600 hover:text-purple-800"
                        >
                             <path d="M12 21.25C11.7623 21.25 11.5269 21.2033 11.3073 21.1123C11.0877 21.0214 10.8881 20.8881 10.72 20.72L3.28 13.28C3.11188 13.1119 2.97853 12.9124 2.88754 12.6928C2.79656 12.4731 2.74973 12.2377 2.74973 12C2.74973 11.7623 2.79656 11.5269 2.88754 11.3073C2.97853 11.0876 3.11188 10.8881 3.28 10.72L10.72 3.28001C11.0656 2.95224 11.5237 2.76953 12 2.76953C12.4763 2.76953 12.9344 2.95224 13.28 3.28001L20.72 10.72C20.8881 10.8881 21.0215 11.0876 21.1125 11.3073C21.2034 11.5269 21.2503 11.7623 21.2503 12C21.2503 12.2377 21.2034 12.4731 21.1125 12.6928C21.0215 12.9124 20.8881 13.1119 20.72 13.28L13.28 20.72C13.1119 20.8881 12.9123 21.0214 12.6927 21.1123C12.4731 21.2033 12.2377 21.25 12 21.25ZM12 4.25001C11.9605 4.24875 11.9213 4.25616 11.885 4.27171C11.8487 4.28726 11.8163 4.31057 11.79 4.34001L4.34 11.79C4.31156 11.8171 4.28892 11.8497 4.27345 11.8858C4.25798 11.9219 4.25 11.9607 4.25 12C4.25 12.0393 4.25798 12.0782 4.27345 12.1143C4.28892 12.1503 4.31156 12.1829 4.34 12.21L11.79 19.66C11.8127 19.6951 11.8438 19.7239 11.8804 19.7439C11.9171 19.7639 11.9582 19.7744 12 19.7744C12.0418 19.7744 12.0829 19.7639 12.1196 19.7439C12.1562 19.7239 12.1873 19.6951 12.21 19.66L19.66 12.21C19.6884 12.1829 19.7111 12.1503 19.7266 12.1143C19.742 12.0782 19.75 12.0393 19.75 12C19.75 11.9607 19.742 11.9219 19.7266 11.8858C19.7111 11.8497 19.6884 11.8171 19.66 11.79L12.21 4.34001C12.1837 4.31057 12.1513 4.28726 12.115 4.27171C12.0787 4.25616 12.0395 4.24875 12 4.25001Z" fill="currentColor"/>
                             <path d="M13.27 14.42C13.1714 14.4205 13.0738 14.4013 12.9828 14.3635C12.8918 14.3257 12.8092 14.2701 12.74 14.2C12.5995 14.0594 12.5207 13.8688 12.5207 13.67C12.5207 13.4713 12.5995 13.2807 12.74 13.14L14.44 11.46L12.74 9.78003C12.6663 9.71137 12.6072 9.62857 12.5662 9.53657C12.5252 9.44457 12.5032 9.34526 12.5014 9.24455C12.4996 9.14385 12.5181 9.04382 12.5559 8.95043C12.5936 8.85705 12.6497 8.77221 12.721 8.70099C12.7922 8.62978 12.877 8.57363 12.9704 8.53591C13.0638 8.49819 13.1638 8.47966 13.2645 8.48144C13.3652 8.48322 13.4645 8.50526 13.5565 8.54625C13.6485 8.58724 13.7313 8.64635 13.8 8.72003L16 10.93C16.071 10.9998 16.1275 11.0831 16.166 11.175C16.2045 11.2668 16.2244 11.3654 16.2244 11.465C16.2244 11.5646 16.2045 11.6633 16.166 11.7551C16.1275 11.847 16.071 11.9302 16 12L13.8 14.2C13.7307 14.2701 13.6482 14.3257 13.5572 14.3635C13.4662 14.4013 13.3685 14.4205 13.27 14.42Z" fill="currentColor"/>
                             <path d="M8.5 15C8.30189 14.9974 8.11263 14.9176 7.97253 14.7775C7.83244 14.6374 7.75259 14.4481 7.75 14.25V11.46C7.75259 11.2619 7.83244 11.0727 7.97253 10.9326C8.11263 10.7925 8.30189 10.7126 8.5 10.71H15.5C15.6989 10.71 15.8897 10.789 16.0303 10.9297C16.171 11.0703 16.25 11.2611 16.25 11.46C16.25 11.6589 16.171 11.8497 16.0303 11.9904C15.8897 12.131 15.6989 12.21 15.5 12.21H9.25V14.21C9.25402 14.3115 9.23766 14.4127 9.20189 14.5078C9.16613 14.6028 9.11168 14.6897 9.04177 14.7633C8.97185 14.837 8.88789 14.8959 8.79484 14.9365C8.70179 14.9772 8.60154 14.9988 8.5 15Z" fill="currentColor"/>
                        </svg>
                      </button>

                      {/* Send message (if not your own post) */}
                      {currentUserId !== selectedCard.userProfile?._id && (
                        <button
                          onClick={(e) =>
                            handleSendMessageClick(selectedCard.userProfile?._id ?? '', e)
                          }
                          className="inline-flex items-center justify-center p-0 hover:bg-transparent"
                          aria-label="Send message"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8 text-purple-600 hover:text-purple-800"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                                 d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z"
                               />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



// 'use client';

// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { useExplore } from '@/lib/hooks/useExplore';
// import { ExploreItem } from '@/lib/types/explore';
// import { useSearchParams, useRouter } from 'next/navigation';
// import { Switch as HeadlessSwitch } from "@headlessui/react";
// import { Menu } from '@headlessui/react';
// import { motion, AnimatePresence} from 'framer-motion';
// import Modal from 'react-modal';
// import { CURRENCIES } from '@/components/main/App';
// import { useSession } from 'next-auth/react';
// import { useLanguage } from '@/lib/context/LanguageContext';
// import ImageWithFallback from '@/components/shared/ImageWithFallback';
// import Loading from '@/components/shared/Loading';

// interface DisplayExploreProps {
//   explores: ExploreItem[];
// }

// const RadiusDropdown = ({ radius, setRadius }: { radius: number; setRadius: (value: number) => void }) => {
//   const options = [
//     { value: 1, label: '1 km' },
//     { value: 2, label: '2 km' },
//     { value: 5, label: '5 km' },
//     { value: 10, label: '10 km' },
//     { value: 20, label: '20 km' },
//     { value: 40, label: '40 km' },
//     { value: 60, label: '60 km' },
//     { value: 80, label: '80 km' },
//     { value: 100, label: '100 km' },
//     { value: 250, label: '250 km' },
//     { value: 500, label: '500 km' },
//   ];

//   return (
//     <Menu as="div" className="relative inline-block w-full text-left">
//       <div>
//         <Menu.Button className="inline-flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-black bg-gray-100 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600">
//           {options.find((option) => option.value === radius)?.label || 'Select Radius'}
//           <svg
//             className="w-5 h-5 ml-2 -mr-1 text-gray-500"
//             xmlns="http://www.w3.org/2000/svg"
//             viewBox="0 0 20 20"
//             fill="currentColor"
//           >
//             <path
//               fillRule="evenodd"
//               d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
//               clipRule="evenodd"
//             />
//           </svg>
//         </Menu.Button>
//       </div>

//       <Menu.Items className="absolute z-10 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg focus:outline-none">
//         {options.map((option) => (
//           <Menu.Item key={option.value}>
//             {({ active }) => (
//               <button
//                 onClick={() => setRadius(option.value)}
//                 className={`${
//                   active ? 'bg-purple-600 text-white' : 'text-gray-900'
//                 } group flex rounded-md items-center w-full px-4 py-2 text-sm`}
//               >
//                 {option.label}
//               </button>
//             )}
//           </Menu.Item>
//         ))}
//       </Menu.Items>
//     </Menu>
//   );
// };

// export default function Explore({ explores: initialExplores }: DisplayExploreProps) {
//   const { dict } = useLanguage();
//   const { explores, isLoading, error } = useExplore(initialExplores);
//   const [selectedCard, setSelectedCard] = useState<ExploreItem | null>(null);
//   const searchParams = useSearchParams();
//   const searchQuery = searchParams?.get('search') || '';
//   const router = useRouter();
//   const { data: session } = useSession();
//   const [currentUserId, setCurrentUserId] = useState<string>('');

//   const [radiusModalOpen, setRadiusModalOpen] = useState(false);
//   const [radius, setRadius] = useState<number>(10);
//   const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
//   const [enableLocation, setEnableLocation] = useState(false);
//   const [noLimit, setNoLimit] = useState(false);
//   const [locationName, setLocationName] = useState<string>('');
//   const [tempRadius, setTempRadius] = useState<number>(radius);
//   const [tempEnableLocation, setTempEnableLocation] = useState<boolean>(enableLocation);
//   const [tempNoLimit, setTempNoLimit] = useState<boolean>(noLimit);
//   const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;

//   // Get current user _id
//   useEffect(() => {
//     const fetchCurrentUser = async () => {
//       if (session?.user?.email) {
//         try {
//           const response = await fetch('/api/users/me');
//           if (response.ok) {
//             const userData = await response.json();
//             setCurrentUserId(userData._id);
//           }
//         } catch (error) {
//           console.error('Error fetching current user:', error);
//         }
//       }
//     };
//     fetchCurrentUser();
//   }, [session?.user?.email]);

//   const haversineDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
//     const toRad = (value: number) => (value * Math.PI) / 180;
//     const R = 6371; // Radius of Earth in km
//     const dLat = toRad(lat2 - lat1);
//     const dLon = toRad(lon2 - lon1);
//     const a =
//       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//       Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
//     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   }, []);

//   // Filter logic
//   const filteredExplores = useMemo(() => {
//     if (!explores) return [];
    
//     let filtered = [...explores];

//     // Apply search filter
//     if (searchQuery) {
//       filtered = filtered.filter((explore) =>
//         explore.description.toLowerCase().includes(searchQuery.toLowerCase())
//       );
//     }

//     // Apply location & radius filter
//     if (!noLimit && enableLocation && userLocation) {
//       filtered = filtered.filter((explore) => {
//         if (!explore.location) return false;
//         const distance = haversineDistance(
//           userLocation.latitude,
//           userLocation.longitude,
//           explore.location.latitude,
//           explore.location.longitude
//         );
//         return distance <= radius;
//       });
//     }
//     return filtered;
//   }, [explores, searchQuery, radius, enableLocation, userLocation, noLimit, haversineDistance]);

//   // Function to get user location
//   const handleGetUserLocation = useCallback(() => {
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         async (position) => {
//           const { latitude, longitude } = position.coords;
//           setUserLocation({ latitude, longitude });
          
//           // Fetch location name using OpenCage
//           try {
//             const response = await fetch(
//               `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`
//             );
//             if (!response.ok) {
//               throw new Error(`API error: ${response.statusText}`);
//             }
//             const data = await response.json();
//             if (data?.results?.[0]?.formatted) {
//               setLocationName(data.results[0].formatted);
//             } else {
//               setLocationName('Unknown Location');
//             }
//           } catch (error) {
//             console.error('Error fetching location name:', error);
//             setLocationName('Unknown Location');
//           }
//         },
//         (error) => {
//           console.error('Error getting user location:', error);
//           alert('Failed to get your location.');
//           setLocationName('Unknown Location');
//         }
//       );
//     } else {
//       alert('Geolocation is not supported by your browser.');
//       setLocationName('Unknown Location');
//     }
//   }, [apiKey]);

//   // Define a function to open Google Maps directions
//   const handleGetDirections = useCallback(
//     (postLat: number, postLng: number) => {
//       // If we already have userLocation, open directions
//       if (userLocation) {
//         window.open(
//           `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${postLat},${postLng}`,
//           '_blank'
//         );
//       } else if (navigator.geolocation) {
//         // If we haven't requested location yet, ask for it
//         navigator.geolocation.getCurrentPosition(
//           (pos) => {
//             const { latitude, longitude } = pos.coords;
//             setUserLocation({ latitude, longitude });
//             window.open(
//               `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${postLat},${postLng}`,
//               '_blank'
//             );
//           },
//           (err) => {
//             console.error('Error fetching location:', err);
//             alert(dict.around.enableLocation); // reuse from dict or just put a string
//           }
//         );
//       } else {
//         alert(dict.around.geolocationNotSupported);
//       }
//     },
//     [userLocation, dict.around, setUserLocation]
//   );

//   // Define a function to handle Send Message
//   const handleSendMessageClick = useCallback(
//     (userId: string, e: React.MouseEvent) => {
//       e.stopPropagation();
//       if (!userId) return;
//       // Don’t open chat with yourself
//       if (currentUserId === userId) {
//         return;
//       }
//       router.push(`/chat/${userId}`);
//     },
//     [router, currentUserId]
//   );

//   // For the radius modal
//   const handleApplyRadius = useCallback(() => {
//     setEnableLocation(tempEnableLocation);
//     setRadius(tempRadius);
//     setRadiusModalOpen(false);
//   }, [tempEnableLocation, tempRadius]);

//   useEffect(() => {
//     if (radiusModalOpen) {
//       setTempRadius(radius);
//       setTempEnableLocation(enableLocation);
//     }
//   }, [radiusModalOpen, radius, enableLocation]);

//   const handleAvatarClick = useCallback(
//     (userId: string, e: React.MouseEvent) => {
//       e.stopPropagation(); // Prevent the post modal from opening
//       if (!userId) return;
//       // Don’t open chat with yourself
//       if (currentUserId === userId) {
//         return;
//       }
//       router.push(`/chat/${userId}`);
//     },
//     [router, currentUserId]
//   );

//   // Loading
//   if (isLoading) {
//     return <Loading />;
//   }
//   // Error
//   if (error) {
//     return (
//       <div className="min-h-screen bg-black text-white flex justify-center items-center">
//         <div className="text-center py-20">
//           <h1 className="text-2xl font-bold text-red-500">{dict.explore.error}</h1>
//         </div>
//       </div>
//     );
//   }
//   // No posts found
//   if (!isLoading && explores && explores.length > 0 && filteredExplores.length === 0) {
//     return (
//       <div className="min-h-screen bg-black text-white flex justify-center items-center">
//         <div className="text-center py-20">
//           <h1 className="text-2xl font-bold">{dict.explore.noPostsFound}</h1>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black">
//       {/* Header Spacer */}
//       <div className="py-6 bg-black border-b border-gray-700" />

//       {/* Set Radius Button */}
//       <div className="absolute top-20 right-12 group z-10">
//         <span
//           onClick={() => setRadiusModalOpen(true)}
//           className="px-4 py-2 text-white bg-transparent cursor-pointer rounded-full group-hover:bg-gray-800 transition-all duration-200"
//         >
//           {dict.explore.setRadius}
//         </span>
//       </div>

//       {/* Grid Layout */}
//       <div className="p-12 pt-20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
//         {filteredExplores.map((explore) => (
//           <motion.div
//             key={explore._id}
//             whileHover={{ scale: 1.05 }}
//             className="space-y-2 cursor-pointer"
//             onClick={() => setSelectedCard(explore)}
//           >
//             <div className="rounded-[2rem] overflow-hidden shadow-md bg-gray-800">
//               <div className="relative w-full h-[400px]">
//                 <ImageWithFallback
//                   src={explore.imageUrl}
//                   alt={`${dict.explore.createdAt} ${explore.createdAt ? new Date(explore.createdAt).toLocaleString() : ''}`}
//                   fill={true}
//                   sizes="(max-width: 768px) 100vw, 33vw"
//                   className="rounded-[2rem] object-cover"
//                 />
//               </div>
//             </div>
//             <div className="text-center">
//               <p className="text-sm font-medium text-white">
//                 {CURRENCIES.find(c => c.value === explore.currency)?.symbol} {explore.price}
//               </p>
//               <p className="text-xs text-gray-400">
//                 {explore.description || dict.explore.noDescription}
//               </p>
//               <p className="text-xs text-gray-500 mb-2">
//                 {explore.createdAt ? new Date(explore.createdAt).toLocaleString() : ''}
//               </p>
//               <div className="flex items-center justify-center space-x-2 mt-2">
//                 <div 
//                   className="relative w-6 h-6 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600"
//                   onClick={(e) => {
//                     e.preventDefault();
//                     e.stopPropagation();
//                     if (explore.userProfile?._id) {
//                       handleAvatarClick(explore.userProfile._id, e);
//                     }
//                   }}
//                 >
//                   <ImageWithFallback
//                     src={explore.userProfile?.avatarUrl || ''}
//                     alt={explore.userProfile?.name || dict.explore.anonymous}
//                     layout="fill"
//                     objectFit="cover"
//                     isAvatar={true}
//                   />
//                 </div>
//                 <span className="text-xs text-gray-300">
//                   {explore.userProfile?.name || dict.explore.anonymous}
//                 </span>
//               </div>
//             </div>
//           </motion.div>
//         ))}
//       </div>

//       {/* Radius Modal */}
//       <Modal
//         isOpen={radiusModalOpen}
//         onRequestClose={() => setRadiusModalOpen(false)}
//         className="relative mx-auto w-full max-w-lg p-6 bg-white rounded-lg shadow-xl"
//         overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
//         ariaHideApp={false}
//       >
//         <h2 className="text-black text-xl font-bold mb-4">{dict.explore.radiusModalTitle}</h2>

//         {/* Enable Location */}
//         <div className="flex items-center justify-between mb-4">
//           <label htmlFor="locationSwitch" className="mr-3 text-gray-600">
//             {dict.explore.enableLocation}
//           </label>
//           <HeadlessSwitch
//             checked={tempEnableLocation}
//             onChange={(value) => {
//               setTempEnableLocation(value);
//               if (value) handleGetUserLocation();
//             }}
//             className={`${
//               tempEnableLocation ? 'bg-purple-600' : 'bg-gray-200'
//             } relative inline-flex h-6 w-11 items-center rounded-full`}
//           >
//             <span
//               className={`${
//                 tempEnableLocation ? 'translate-x-6' : 'translate-x-1'
//               } inline-block h-4 w-4 transform bg-white rounded-full transition-transform`}
//             />
//           </HeadlessSwitch>
//         </div>

//         {tempEnableLocation && locationName && (
//           <div className="mb-4 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700">
//             {dict.explore.locationLabel}: {locationName}
//           </div>
//         )}

//         {/* No Limit */}
//         <div className="flex items-center justify-between mb-4">
//           <label htmlFor="noLimitSwitch" className="text-gray-600 mr-3">
//             {dict.explore.noLimit}
//           </label>
//           <HeadlessSwitch
//             checked={tempNoLimit}
//             onChange={(value) => {
//               setTempNoLimit(value);
//               if (value) {
//                 setTempEnableLocation(false);
//                 setTempRadius(0);
//               }
//             }}
//             className={`${
//               tempNoLimit ? 'bg-purple-600' : 'bg-gray-200'
//             } relative inline-flex h-6 w-11 items-center rounded-full`}
//           >
//             <span
//               className={`${
//                 tempNoLimit ? 'translate-x-6' : 'translate-x-1'
//               } inline-block h-4 w-4 transform bg-white rounded-full transition-transform`}
//             />
//           </HeadlessSwitch>
//         </div>
//         <div className="mt-6 flex justify-end">
//           <button
//             onClick={handleApplyRadius}
//             className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
//           >
//             {dict.explore.apply}
//           </button>
//         </div>
//       </Modal>

//       {/* Post Modal */}
//       <AnimatePresence>
//         {selectedCard && (
//           <motion.div
//             initial={{ opacity: 0, scale: 0.9 }}
//             animate={{ opacity: 1, scale: 1 }}
//             exit={{ opacity: 0, scale: 0.9 }}
//             transition={{ duration: 0.5 }}
//             className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
//             onClick={() => setSelectedCard(null)}
//           >
//             <motion.div
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-2xl shadow-xl w-[90%] max-w-4xl p-8 text-black"
//             >
//               <div className="grid grid-cols-2 gap-6">
//                 {/* Left Column: Image */}
//                 <div className="overflow-hidden rounded-lg">
//                   <ImageWithFallback
//                     src={selectedCard.imageUrl}
//                     alt={`${dict.explore.createdAt} ${selectedCard.createdAt ? new Date(selectedCard.createdAt).toLocaleString() : ''}`}
//                     width={500}
//                     height={500}
//                     className="object-cover w-full h-full"
//                   />
//                 </div>

//                 {/* Right Column: Content */}
//                 <div className="flex flex-col space-y-4">
//                   {/* Avatar & Name */}
//                   <div className="flex items-center space-x-3 mb-4">
//                     <div 
//                       className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600"
//                       onClick={(e) => {
//                         e.preventDefault();
//                         e.stopPropagation();
//                         if (selectedCard.userProfile?._id) {
//                           handleAvatarClick(selectedCard.userProfile._id, e);
//                         }
//                       }}
//                     >
//                       <ImageWithFallback
//                         src={selectedCard.userProfile?.avatarUrl || ''}
//                         alt={selectedCard.userProfile?.name || dict.explore.anonymous}
//                         layout="fill"
//                         objectFit="cover"
//                         isAvatar={true}
//                       />
//                     </div>
//                     <div>
//                       <p className="font-medium text-gray-900">
//                         {selectedCard.userProfile?.name || dict.explore.anonymous}
//                       </p>
//                     </div>
//                   </div>

//                   {/* Title, Time, Price, Location */}
//                   <h2 className="text-2xl font-bold">
//                     {selectedCard.description || dict.explore.noDescription}
//                   </h2>
//                   <p className="text-gray-600 text-sm">
//                     {dict.explore.createdAt}: {selectedCard.createdAt ? new Date(selectedCard.createdAt).toLocaleString() : ''}
//                   </p>
//                   <p className="text-lg font-semibold text-black">
//                     {CURRENCIES.find(c => c.value === selectedCard?.currency)?.symbol} {selectedCard?.price || ''}
//                   </p>
//                   {selectedCard?.location && (
//                     <p className="text-gray-600">
//                       {dict.explore.locationLabel}: {selectedCard.location.city}, {selectedCard.location.country}
//                     </p>
//                   )}

//                   <div className="border-t border-gray-200 pt-4 space-y-2">
//                     {/* --- Buttons for Directions and Send Message --- */}
//                     {selectedCard.location && (
//                       <div className="flex items-center space-x-6">
//                         {/* 1) Get Directions Button */}
//                         <button
//                           onClick={() =>
//                             selectedCard.location && handleGetDirections(
//                               selectedCard.location.latitude,
//                               selectedCard.location.longitude
//                             )
//                           }
//                           className="inline-flex items-center justify-center p-0 hover:bg-transparent"
//                           aria-label="Get directions"
//                         >
//                           <svg
//                             width="24"
//                             height="24"
//                             viewBox="0 0 24 24"
//                             fill="none"
//                             xmlns="http://www.w3.org/2000/svg"
//                             className="h-8 w-8 text-purple-600 hover:text-purple-800"
//                           >
//                             <path
//                               d="M12 21.25C11.7623 21.25 11.5269 21.2033 11.3073 21.1123C11.0877 21.0214 10.8881 20.8881 10.72 20.72L3.28 13.28C3.11188 13.1119 2.97853 12.9124 2.88754 12.6928C2.79656 12.4731 2.74973 12.2377 2.74973 12C2.74973 11.7623 2.79656 11.5269 2.88754 11.3073C2.97853 11.0876 3.11188 10.8881 3.28 10.72L10.72 3.28001C11.0656 2.95224 11.5237 2.76953 12 2.76953C12.4763 2.76953 12.9344 2.95224 13.28 3.28001L20.72 10.72C20.8881 10.8881 21.0215 11.0876 21.1125 11.3073C21.2034 11.5269 21.2503 11.7623 21.2503 12C21.2503 12.2377 21.2034 12.4731 21.1125 12.6928C21.0215 12.9124 20.8881 13.1119 20.72 13.28L13.28 20.72C13.1119 20.8881 12.9123 21.0214 12.6927 21.1123C12.4731 21.2033 12.2377 21.25 12 21.25ZM12 4.25001C11.9605 4.24875 11.9213 4.25616 11.885 4.27171C11.8487 4.28726 11.8163 4.31057 11.79 4.34001L4.34 11.79C4.31156 11.8171 4.28892 11.8497 4.27345 11.8858C4.25798 11.9219 4.25 11.9607 4.25 12C4.25 12.0393 4.25798 12.0782 4.27345 12.1143C4.28892 12.1503 4.31156 12.1829 4.34 12.21L11.79 19.66C11.8127 19.6951 11.8438 19.7239 11.8804 19.7439C11.9171 19.7639 11.9582 19.7744 12 19.7744C12.0418 19.7744 12.0829 19.7639 12.1196 19.7439C12.1562 19.7239 12.1873 19.6951 12.21 19.66L19.66 12.21C19.6884 12.1829 19.7111 12.1503 19.7266 12.1143C19.742 12.0782 19.75 12.0393 19.75 12C19.75 11.9607 19.742 11.9219 19.7266 11.8858C19.7111 11.8497 19.6884 11.8171 19.66 11.79L12.21 4.34001C12.1837 4.31057 12.1513 4.28726 12.115 4.27171C12.0787 4.25616 12.0395 4.24875 12 4.25001Z"
//                               fill="currentColor"
//                             />
//                             <path
//                               d="M13.27 14.42C13.1714 14.4205 13.0738 14.4013 12.9828 14.3635C12.8918 14.3257 12.8092 14.2701 12.74 14.2C12.5995 14.0594 12.5207 13.8688 12.5207 13.67C12.5207 13.4713 12.5995 13.2807 12.74 13.14L14.44 11.46L12.74 9.78003C12.6663 9.71137 12.6072 9.62857 12.5662 9.53657C12.5252 9.44457 12.5032 9.34526 12.5014 9.24455C12.4996 9.14385 12.5181 9.04382 12.5559 8.95043C12.5936 8.85705 12.6497 8.77221 12.721 8.70099C12.7922 8.62978 12.877 8.57363 12.9704 8.53591C13.0638 8.49819 13.1638 8.47966 13.2645 8.48144C13.3652 8.48322 13.4645 8.50526 13.5565 8.54625C13.6485 8.58724 13.7313 8.64635 13.8 8.72003L16 10.93C16.071 10.9998 16.1275 11.0831 16.166 11.175C16.2045 11.2668 16.2244 11.3654 16.2244 11.465C16.2244 11.5646 16.2045 11.6633 16.166 11.7551C16.1275 11.847 16.071 11.9302 16 12L13.8 14.2C13.7307 14.2701 13.6482 14.3257 13.5572 14.3635C13.4662 14.4013 13.3685 14.4205 13.27 14.42Z"
//                               fill="currentColor"
//                             />
//                             <path
//                               d="M8.5 15C8.30189 14.9974 8.11263 14.9176 7.97253 14.7775C7.83244 14.6374 7.75259 14.4481 7.75 14.25V11.46C7.75259 11.2619 7.83244 11.0727 7.97253 10.9326C8.11263 10.7925 8.30189 10.7126 8.5 10.71H15.5C15.6989 10.71 15.8897 10.789 16.0303 10.9297C16.171 11.0703 16.25 11.2611 16.25 11.46C16.25 11.6589 16.171 11.8497 16.0303 11.9904C15.8897 12.131 15.6989 12.21 15.5 12.21H9.25V14.21C9.25402 14.3115 9.23766 14.4127 9.20189 14.5078C9.16613 14.6028 9.11168 14.6897 9.04177 14.7633C8.97185 14.837 8.88789 14.8959 8.79484 14.9365C8.70179 14.9772 8.60154 14.9988 8.5 15Z"
//                               fill="currentColor"
//                             />
//                           </svg>
//                         </button>

//                         {/* 2) Send a Message Button (Hide if it’s your own post) */}
//                         {currentUserId !== selectedCard.userProfile?._id && (
//                           <button
//                             onClick={(e) =>
//                               handleSendMessageClick(selectedCard.userProfile?._id ?? '', e)
//                             }
//                             className="inline-flex items-center justify-center p-0 hover:bg-transparent"
//                             aria-label="Send message"
//                           >
//                             <svg
//                               xmlns="http://www.w3.org/2000/svg"
//                               className="h-8 w-8 text-purple-600 hover:text-purple-800"
//                               fill="none"
//                               viewBox="0 0 24 24"
//                               stroke="currentColor"
//                               strokeWidth={2}
//                             >
//                               <path
//                                 strokeLinecap="round"
//                                 strokeLinejoin="round"
//                                 d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z"
//                               />
//                             </svg>
//                           </button>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }
