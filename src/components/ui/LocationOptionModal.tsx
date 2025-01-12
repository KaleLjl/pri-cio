import React, { useState } from 'react';
import Modal from './Modal'; // Assuming you have a base Modal component
import { Switch as HeadlessSwitch } from "@headlessui/react";

interface LocationOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseCurrentLocation: (location: { lat: number; lng: number }) => void;
}

const LocationOptionModal: React.FC<LocationOptionModalProps> = ({
  isOpen,
  onClose,
  onUseCurrentLocation,
}) => {
  const [inputAddress, setInputAddress] = useState('');
  const [inputCoordinates, setInputCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // For displaying errors
  const [enableLocation, setEnableLocation] = useState(false);

  const handleUseCurrentLocation = async () => {
    if (navigator.geolocation) {
      setIsFetchingLocation(true);
      setErrorMessage(''); // Clear any existing errors
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
    if (!inputAddress.trim()) {
      setErrorMessage('Please enter a valid location name.');
      return;
    }

    setIsFetchingLocation(true);
    setErrorMessage(''); // Clear any existing errors
    const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(inputAddress)}&key=${apiKey}`;

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

  const handleConfirm = () => {
    if (inputCoordinates) {
      console.log('Passing coordinates to onUseCurrentLocation:', inputCoordinates);
      onUseCurrentLocation(inputCoordinates);
      onClose();
    } else {
      setErrorMessage('Please select or enter a valid location before confirming.');
    }
  };

  return (
    <Modal
      title="Select Location Option"
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmText="Confirm"
      cancelText="Cancel"
    >
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="locationSwitch" className="text-black font-medium">
            Enable Location
          </label>
          <HeadlessSwitch
          checked={enableLocation}
          onChange={(checked) => {
            setEnableLocation(checked);
            if (checked) handleUseCurrentLocation();
          }}
          className={`${
            enableLocation ? 'bg-purple-600' : 'bg-gray-200'
          } relative inline-flex h-6 w-11 items-center rounded-full`}
        >
          <span
            className={`${
              enableLocation ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform bg-white rounded-full transition-transform`}
          />
        </HeadlessSwitch>
        </div>
        <input
          type="text"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="Enter your location"
          className="px-4 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:ring-opacity-50 focus:border-[#6D28D9]"
        />
        <button
          onClick={handleGeocodeInputLocation}
          className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
          disabled={isFetchingLocation}
        >
          {isFetchingLocation ? 'Searching...' : 'Search Location'}
        </button>
        {errorMessage && <p className="text-red-600">{errorMessage}</p>} {/* Show errors only */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent text-black rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LocationOptionModal;

