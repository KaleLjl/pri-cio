'use client';

import Image from 'next/image';
import { useHistory,HistoryItem } from '@/lib/hooks/useHistory';
import { useState } from 'react';

interface DisplayHistoryProps {
  histories: HistoryItem[];
}

export default function DisplayHistory({ histories: initialHistories }: DisplayHistoryProps) {
  const { histories, isLoading, error, deleteHistory, postHistory } = useHistory(initialHistories);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  // Function to handle posting with location
  const handlePostWithLocation = async () => {
    try {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
  
      navigator.geolocation.getCurrentPosition(async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
  
        // Pass location when posting
        if (selectedHistory) {
          const updatedHistory = { ...selectedHistory, location }; // Add location to history item
          await postHistory(updatedHistory);
          setShowLocationModal(false); // Close modal after posting
        }
      });
    } catch (error) {
      console.error('Failed to post with location:', error);
    }
  };
  


  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">History</h1>

      {histories.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No history records found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {histories.map((history) => (
            <div
              key={history._id}
              className="relative bg-white rounded-lg shadow-md overflow-hidden group"
              onMouseLeave={() => setActiveDropdown(null)} // Close dropdown when hovering out of the card
            >
              <div className="relative h-80 w-full p-40">
                <Image
                  src={history.imageUrl}
                  alt={history.description || 'Product image'}
                  fill
                  className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={() => {
                    console.error(`Failed to load image: ${history.imageUrl}`);
                  }}
                />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === history._id ? null : history._id);
                    }}
                    className="text-white hover:text-gray-800"
                  >
                    •••
                  </button>
                  {activeDropdown === history._id && (
                    <div className="absolute right-0 mt-2 w-20 bg-white/50 shadow-lg rounded-lg p-2 backdrop-blur-sm border border-gray-300 z-10 transition-transform duration-200 ease-in-out">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistory(history._id);
                          setActiveDropdown(null);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-gray-100 rounded"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHistory(history); // Set the selected history
                          setShowLocationModal(true); // Show the location modal
                          setActiveDropdown(null);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-gray-100 rounded"
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-lg font-semibold text-green-400">
                    ${history.price || 'N/A'}
                  </p>
                  <p className="text-sm mt-1">{history.description || 'No description available'}</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {history.createdAt
                      ? new Date(history.createdAt).toLocaleString()
                      : 'Date not available'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {/* Location Permission Modal */}
          {showLocationModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Enable Location Services</h2>
                <p className="text-gray-600 mb-6">
                  This post requires location permission to include your current location. Allow it?
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowLocationModal(false)}
                    className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePostWithLocation}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Allow
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}







