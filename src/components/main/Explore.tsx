'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useExplore } from '@/lib/hooks/useExplore';
import { ExploreItem } from '@/lib/types/explore';
import { useSearchParams } from 'next/navigation';
import Switch from "react-switch";
import { Switch as HeadlessSwitch } from "@headlessui/react";
import { Menu } from '@headlessui/react';
import { motion, AnimatePresence} from 'framer-motion';
import Modal from 'react-modal';

interface DisplayExploreProps {
  explores: ExploreItem[];
}

const RadiusDropdown = ({ radius, setRadius }: { radius: number; setRadius: (value: number) => void }) => {
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
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
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

const ImageWithFallback = ({ src, alt, ...props }: any) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  return (
    <Image
      {...props}
      src={error ? '/image/placeholder.jpg' : imgSrc}
      alt={alt}
      onError={() => {
        setError(true);
        setImgSrc('/image/placeholder.jpg');
      }}
    />
  );
};

export default function Explore({ explores: initialExplores }: DisplayExploreProps) {
  const { explores, isLoading, error } = useExplore(initialExplores);
  const [selectedCard, setSelectedCard] = useState<ExploreItem | null>(null);  
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('search') || '';

  const [radiusModalOpen, setRadiusModalOpen] = useState(false);
  const [radius, setRadius] = useState<number>(10);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [enableLocation, setEnableLocation] = useState(false);
  const [noLimit, setNoLimit] = useState(false);
  const [locationName, setLocationName] = useState<string>('');
  const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;

  const haversineDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Radius of Earth in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // Calculate filtered explores directly instead of using state
  const filteredExplores = useMemo(() => {
    if (!explores) return [];
    
    let filtered = [...explores];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((explore) =>
        explore.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply location and radius filter
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
  }, [explores, searchQuery, radius, enableLocation, userLocation, noLimit, haversineDistance]);

  const handleGetUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          
          // Fetch location name using OpenCage API
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`
            );
            if (!response.ok) {
              throw new Error(`API error: ${response.statusText}`);
            }
            const data = await response.json();

            if (data?.results?.[0]?.formatted) {
              setLocationName(data.results[0].formatted);
            } else {
              setLocationName('Unknown Location');
            }
          } catch (error) {
            console.error('Error fetching location name:', error);
            setLocationName('Unknown Location');
          }
        },
        (error) => {
          console.error('Error getting user location:', error);
          alert('Failed to get your location.');
          setLocationName('Unknown Location');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setLocationName('Unknown Location');
    }
  }, [apiKey]);

  const handleApplyRadius = useCallback(() => {
    if (noLimit) {
      setEnableLocation(false);
      setRadius(0);
    } else if (enableLocation && radius) {
      setEnableLocation(true);
      setRadius(radius);
    }
    setRadiusModalOpen(false);
  }, [noLimit, enableLocation, radius]);

  // Check loading state first
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-red-500">{error}</h1>
        </div>
      </div>
    );
  }

  // Only show no posts found when we have loaded the data and filtered it
  if (!isLoading && explores && explores.length > 0 && filteredExplores.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Sorry, no posts found</h1>
        </div>
      </div>
    );
  }

  // Show loading if we have no explores data yet
  if (!explores || explores.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header Spacer */}
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

      {/* Grid Layout */}
      <div className="p-12 pt-20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {filteredExplores.map((explore) => (
          <motion.div
            key={explore._id}
            whileHover={{ scale: 1.05 }}
            className="space-y-2 cursor-pointer"
            onClick={() => setSelectedCard(explore)}
          >
            <div className="rounded-[2rem] overflow-hidden shadow-md bg-gray-800">
              <div className="relative w-full h-80">
                <ImageWithFallback
                  src={explore.imageUrl}
                  alt={`Post created on ${new Date(explore.createdAt).toLocaleString()}`}
                  layout="fill"
                  objectFit="cover"
                  placeholder="blur"
                  blurDataURL="/image/placeholder.jpg"
                  className="rounded-[2rem]"
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">${explore.price}</p>
              <p className="text-xs text-gray-400">
                {explore.description || 'No description available'}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {new Date(explore.createdAt).toLocaleString()}
              </p>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <div className="relative w-6 h-6 rounded-full overflow-hidden">
                  <Image
                    src={explore.userProfile?.avatarUrl || '/default-avatar.png'}
                    alt={explore.userProfile?.name || 'User'}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <span className="text-xs text-gray-300">
                  {explore.userProfile?.name || 'Anonymous'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Radius Modal */}
      <Modal
        isOpen={radiusModalOpen}
        onRequestClose={() => setRadiusModalOpen(false)}
        className="relative mx-auto w-full max-w-lg p-6 bg-white rounded-lg shadow-xl"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
        ariaHideApp={false}
      >
        <h2 className="text-black text-xl font-bold mb-4">Set Radius</h2>
        <div className="flex items-center mb-4">
          <label htmlFor="locationSwitch" className="mr-3 text-gray-600">
            Enable Location
          </label>
          <Switch
            onChange={(value) => {
              setEnableLocation(value);
              if (value) handleGetUserLocation();
            }}
            checked={enableLocation}
            onColor="#6D28D9"
            offColor="#ccc"
            className="react-switch"
          />
        </div>
        {enableLocation && locationName && (
          <div className="mb-4 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700">
            Location: {locationName}
          </div>
        )}
        {enableLocation && (
          <div className="mb-4">
            <RadiusDropdown radius={radius} setRadius={setRadius} />
          </div>
        )}
        <div className="flex items-center">
          <HeadlessSwitch
            checked={noLimit}
            onChange={(value) => {
              setNoLimit(value);
              if (value) {
                setEnableLocation(false);
                setRadius(0);
              }
            }}
            className={`${
              noLimit ? 'bg-purple-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span
              className={`${
                noLimit ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform bg-white rounded-full transition-transform`}
            />
          </HeadlessSwitch>
          <span className="ml-3 text-gray-600">No Limit</span>
        </div>
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
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column: Image */}
                <div className="overflow-hidden rounded-lg">
                  <ImageWithFallback
                    src={selectedCard.imageUrl}
                    alt={`Post created on ${new Date(selectedCard.createdAt).toLocaleString()}`}
                    width={500}
                    height={500}
                    className="object-cover w-full h-full"
                  />
                </div>

                {/* Right Column: Content */}
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden">
                      <Image
                        src={selectedCard.userProfile?.avatarUrl || '/default-avatar.png'}
                        alt={selectedCard.userProfile?.name || 'User'}
                        layout="fill"
                        objectFit="cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedCard.userProfile?.name || 'Anonymous'}
                      </p>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold">
                    {selectedCard.description || 'No description available'}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Created at: {new Date(selectedCard.createdAt).toLocaleString()}
                  </p>
                  <p className="text-lg font-semibold text-black">${selectedCard.price}</p>

                  {selectedCard?.location && (
                    <p className="text-gray-600">
                      Location: {selectedCard.location.city}, {selectedCard.location.country}
                    </p>
                  )}

                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <p className="text-gray-500 text-sm">0 comments</p>
                    <div className="flex items-start space-x-4">
                      <div className="h-10 w-10 rounded-full bg-gray-300" />
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}