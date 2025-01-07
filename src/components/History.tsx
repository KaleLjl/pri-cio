'use client';

import Image from 'next/image';
import { useHistory } from '@/lib/hooks/useHistory';
import { usePublish } from '@/lib/hooks/usePublish';
import { useState, useEffect } from 'react';
import { HistoryItem } from '@/lib/types/history';
import Toast from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';

interface DisplayHistoryProps {
  histories: HistoryItem[];
}

export default function DisplayHistory({ histories: initialHistories }: DisplayHistoryProps) {
  const { histories, setHistories, isLoading, error, deleteHistory } = useHistory(initialHistories);
  const { 
    postHistoryToExplore, 
    unpublishHistory,
    isSaving,
    locationPermission,
    handleLocationPermission,
    showToast,
    setShowToast,
    toastMessage,
    toastType,
  } = usePublish(setHistories);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  
  const handlePost = async (history: HistoryItem) => {
    try {
      // If permission was already granted, post directly
      if (locationPermission === 'granted') {
        await postHistoryToExplore(history);
        return;
      }

      // If permission was denied, post without location
      if (locationPermission === 'denied') {
        await postHistoryToExplore(history);
        return;
      }

      // If permission hasn't been decided yet, show modal
      setSelectedHistory(history);
      setShowLocationModal(true);
    } catch (error) {
      console.error('Failed to post:', error);
    }
  };

  const handlePostWithLocation = async () => {
    if (!selectedHistory) return;

    try {
      handleLocationPermission('granted');
      await postHistoryToExplore(selectedHistory);
      setShowLocationModal(false);
    } catch (error) {
      console.error('Failed to post with location:', error);
    }
  };

  const handlePostWithoutLocation = async () => {
    if (!selectedHistory) return;

    try {
      handleLocationPermission('denied');
      await postHistoryToExplore(selectedHistory);
      setShowLocationModal(false);
    } catch (error) {
      console.error('Failed to post without location:', error);
    }
  };
  
  const [postedHistories, setPostedHistories] = useState<HistoryItem[]>([]);

  useEffect(() => {
    console.log('Current histories:', histories);
    const posted = histories.filter(history => history.exploreId);
    console.log('Posted histories:', posted);
    setPostedHistories(posted);
  }, [histories]);

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
          {histories.filter(history => !history.exploreId).map((history) => (
            <div
              key={history._id}
              className="relative bg-white rounded-lg shadow-md overflow-hidden group"
              onMouseLeave={() => setActiveDropdown(null)}
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
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  {history.exploreId && (
                    <span className="px-2 py-1 text-xs bg-green-500 text-white rounded-full">
                      Posted
                    </span>
                  )}
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
                      {!history.exploreId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePost(history);
                          }}
                          disabled={isSaving}
                          className="block w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-gray-100 rounded"
                        >
                          {isSaving ? 'Posting...' : 'Post'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (history.exploreId) {
                              unpublishHistory(history._id, history.exploreId);
                            }
                            setActiveDropdown(null);
                          }}
                          className="block w-full text-left px-2 py-1 text-sm text-orange-600 hover:bg-gray-100 rounded"
                        >
                          Unpublish
                        </button>
                      )}
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
        </div>
      )}
      
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <span>Posted Items</span>
          <span className="ml-3 text-sm font-normal text-gray-500">
            ({postedHistories.length} items)
          </span>
        </h2>
        
        {postedHistories.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No posted items yet</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postedHistories.map((history) => (
              <div
                key={history._id}
                className="relative bg-white rounded-lg shadow-md overflow-hidden group"
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <div className="relative h-80 w-full p-40">
                  <Image
                    src={history.imageUrl}
                    alt={history.description || 'Product image'}
                    fill
                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-2">
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
                      <div className="absolute right-0 mt-2 w-20 bg-white/50 shadow-lg rounded-lg p-2 backdrop-blur-sm border border-gray-300 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (history.exploreId) {
                              unpublishHistory(history._id, history.exploreId);
                            }
                            setActiveDropdown(null);
                          }}
                          className="block w-full text-left px-2 py-1 text-sm text-orange-600 hover:bg-gray-100 rounded"
                        >
                          Unpublish
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
          </div>
        )}
      </div>

      <Modal 
        title="Enable Location Services"
        message="Would you like to include your location with posts? This helps other users find items near them."
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          handlePostWithoutLocation();
        }}
        onConfirm={handlePostWithLocation}
        confirmText="Allow Location"
        cancelText="Don't Allow"
      />

      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        type={toastType}
        duration={2000}
      />
    </div>
  );
}







