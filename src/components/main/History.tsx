'use client';
import React, { useState, useEffect } from 'react';
import { useHistory } from '@/lib/hooks/useHistory';
import { HistoryItem } from '@/lib/types/history';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Switch } from '@headlessui/react';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import EditModal from '@/components/ui/EditModal';

export default function History({ histories: initialHistories }: { histories: HistoryItem[] }) {
  const {
    histories,
    setHistories,
    isLoading,
    isSaving,
    error,
    deleteHistory,
    updateHistory,
    postHistoryToExplore,
    unpublishHistory,
    locationPermission,
    handleLocationPermission,
    canPost,
  } = useHistory(initialHistories);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Define the action with toast 
  const showNewToast = (message: string, type: 'success' | 'error' | 'info') => {
    setShowToast(false);
    setTimeout(() => {
      setToastMessage(message);
      setToastType(type);
      setShowToast(true);
    }, 100);
  };

  const handleDelete = async (historyId: string) => {
    try {
      await deleteHistory(historyId);
      showNewToast('Successfully deleted!', 'success');
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : 'Failed to delete history', 
        'error'
      );
    }
  };

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  
  const handlePost = async (history: HistoryItem) => {
    try {
      if (locationPermission === 'granted') {
        await postHistoryToExplore(history);
        showNewToast('Successfully posted to explore!', 'success');
        return;
      }

      if (locationPermission === 'denied') {
        await postHistoryToExplore(history);
        showNewToast('Successfully posted to explore!', 'success');
        return;
      }

      setSelectedHistory(history);
      setShowLocationModal(true);
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : 'Failed to post history',
        'error'
      );
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
    const posted = histories.filter(history => history.exploreId);
    setPostedHistories(posted);
  }, [histories]);

  const handleUnpublish = async (historyId: string, exploreId: string) => {
    try {
      await unpublishHistory(historyId, exploreId);
      showNewToast('Successfully unpublished!', 'success');
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : 'Failed to unpublish',
        'error'
      );
    }
  };

  const [editingHistory, setEditingHistory] = useState<HistoryItem | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleEdit = (history: HistoryItem) => {
    setEditingHistory(history);
    setEditPrice(history.price || '');
    setEditDescription(history.description || '');
    setActiveDropdown(null);
  };

  const handleUpdate = async () => {
    if (!editingHistory) return;

    try {
      await updateHistory(editingHistory._id, {
        price: editPrice,
        description: editDescription,
      });
      setEditingHistory(null);
      showNewToast('Successfully updated!', 'success');
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : 'Failed to update history',
        'error'
      );
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
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQrJyEwPENBLzMzLy0zPVBCR0JHMz1DcWl5VGR2h4iIl5eXqqqq+vr6////2wBDAR"
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
                          handleDelete(history._id);
                          setActiveDropdown(null);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-gray-100 rounded"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePost(history);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-gray-100 rounded"
                      >
                        Post
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(history);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-gray-100 rounded"
                      >
                        Edit
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
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQrJyEwPENBLzMzLy0zPVBCR0JHMz1DcWl5VGR2h4iIl5eXqqqq+vr6////2wBDAR"
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
                              handleUnpublish(history._id, history.exploreId);
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

      <EditModal
        isOpen={!!editingHistory}
        onClose={() => setEditingHistory(null)}
        onSave={handleUpdate}
        price={editPrice}
        description={editDescription}
        onPriceChange={setEditPrice}
        onDescriptionChange={setEditDescription}
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







