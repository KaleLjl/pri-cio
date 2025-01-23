'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from '@/lib/hooks/useHistory';
import { HistoryItem } from '@/lib/types/history';
import { useSession } from 'next-auth/react'; // To fetch user session data
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Switch } from '@headlessui/react';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import EditModal from '@/components/ui/EditModal';
import LocationOptionModal from '../ui/LocationOptionModal';
import { Avatar } from '@mui/material';
import { useProfilePage } from '@/lib/hooks/useProfilePage'; // Import the custom hook
import { CURRENCIES, Currency } from '@/components/main/App'; // Import types and data
import { useLanguage } from '@/lib/context/LanguageContext';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

interface HistoryProps {
  histories: HistoryItem[];
}

export default function History({ histories: initialHistories }: HistoryProps) {
  const { dict } = useLanguage();
  const {
    histories,
    setHistories,
    isLoading,
    isSaving,
    error,
    formData,
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

  const { data: session } = useSession(); // User session
  const userId = session?.user?.id || '';
  const userEmail = session?.user?.email || '';
  const emailInitial = userEmail.charAt(0).toUpperCase(); // Default avatar with email initial
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // State for avatar URL
  const { fetchProfileData } = useProfilePage(userId);
  const [activeTab, setActiveTab] = useState<'saved' | 'posted'>('saved');
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const [savedItemsHeight, setSavedItemsHeight] = useState<number>(0);
  const [postedItemsHeight, setPostedItemsHeight] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const savedItemsRef = useRef<HTMLDivElement>(null);
  const postedItemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await fetchProfileData(); // Fetch profile data
        setAvatarUrl(profileData.avatarUrl || null); // Set avatar URL
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();
  }, [fetchProfileData]);

  useEffect(() => {
    // Measure the height of the active tab's content
    const updateHeight = () => {
      if (activeTab === 'saved' && savedItemsRef.current) {
        setContainerHeight(savedItemsRef.current.offsetHeight);
      } else if (activeTab === 'posted' && postedItemsRef.current) {
        setContainerHeight(postedItemsRef.current.offsetHeight);
      }
    };

    updateHeight();
    // Recalculate height on window resize
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [activeTab, histories]);
  
  const handleTabChange = (tab: 'saved' | 'posted') => {
    if (tab !== activeTab) {
      setTransitionDirection(tab === 'saved' ? 'left' : 'right');
      setActiveTab(tab);
    }
  };

  // Define the action with toast 
  const showNewToast = (message: string, type: 'success' | 'error' | 'info') => {
    setShowToast(false);
    setTimeout(() => {
      setToastMessage(message);
      setToastType(type);
      setShowToast(true);
    }, 100);
  };

  const [actionInProgress, setActionInProgress] = useState<{[key: string]: string}>({});

  const handleDelete = async (historyId: string) => {
    try {
      setActionInProgress({...actionInProgress, [historyId]: 'deleting'});
      await deleteHistory(historyId);
      showNewToast('Successfully deleted!', 'success');
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : 'Failed to delete history', 
        'error'
      );
    } finally {
      setActionInProgress({...actionInProgress, [historyId]: ''});
    }
  };

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  const [showLocationOptionModal, setShowLocationOptionModal] = useState(false);
  
  const handlePost = async (history: HistoryItem) => {
    try {
      setActionInProgress({...actionInProgress, [history._id]: 'posting'});
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
    } finally {
      setActionInProgress({...actionInProgress, [history._id]: ''});
    }
  };
  
  const handlelocation = async (history: HistoryItem) => {
    setSelectedHistory(history); // Set the selected history
    setShowLocationOptionModal(true);
  }

  const handleSetLocation = async (location: { lat: number; lng: number }) => {
    if (!selectedHistory) return;

    try {
      setActionInProgress({ ...actionInProgress, [selectedHistory._id]: 'posting' });

      const locationData = {
        latitude: location.lat,
        longitude: location.lng,
      };

      await postHistoryToExplore({ ...selectedHistory, location: locationData });

      showNewToast('Successfully posted!', 'success');
      setShowLocationOptionModal(false);
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : 'Failed to post history',
        'error'
      );
    } finally {
      setActionInProgress({ ...actionInProgress, [selectedHistory._id]: '' });
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
  const savedItemsCount = histories.filter(history => !history.exploreId).length;

  useEffect(() => {
    const posted = histories.filter(history => history.exploreId);
    setPostedHistories(posted);
  }, [histories]);

  const handleUnpublish = async (historyId: string, exploreId: string) => {
    try {
      setActionInProgress({...actionInProgress, [historyId]: 'unpublishing'});
      await unpublishHistory(historyId, exploreId);
      showNewToast('Successfully unpublished!', 'success');
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : 'Failed to unpublish',
        'error'
      );
    } finally {
      setActionInProgress({...actionInProgress, [historyId]: ''});
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
    return <div className="text-center py-10 text-red-500">{dict.history.error}</div>;
  }

  if (isLoading) {
    return <div className="text-center py-10">{dict.history.loading}</div>;
  }

  console.log('Avatar URL:', formData.avatarUrl);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-10"></h1>
      {/* Header Section */}
      <div className="relative flex flex-col items-center">
        <div className="relative w-[150px] h-[150px] rounded-full overflow-hidden">
          <ImageWithFallback
            src={avatarUrl || ''}
            alt={session?.user?.name || emailInitial}
            layout="fill"
            objectFit="cover"
            isAvatar={true}
          />
        </div>
        <h1 className="text-2xl text-white font-bold mt-4">{session?.user?.name || 'User'}</h1>
        <p className="text-sm text-gray-400 mt-2">{userId || 'N/A'}</p>
        <button
          onClick={() => {
            window.location.href = '/editprofile';
          }}
          className="mt-4 px-4 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-300 transition duration-200"
        >
          {dict.history.editProfile}
        </button>
      </div>

      {/* Tab Controls */}
      <div className="mt-4 flex justify-center space-x-4">
          <button
            onClick={() => handleTabChange('saved')}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'saved' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-black'}`}
          >
            {dict.history.savedItems}
          </button>
          <button
            onClick={() => handleTabChange('posted')}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'posted' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-black'}`}
          >
            {dict.history.postedItems}
          </button>
      </div>

      {/* Tab Content */}
      <div className="relative mt-6 overflow-hidden" style={{ height: containerHeight }}>
        <div 
          ref={savedItemsRef}
          className={`absolute w-full transition-transform duration-300 ${
          activeTab === 'saved' ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
            <span>{dict.history.savedItems}</span>
            <span className="ml-3 text-sm font-normal text-gray-500">
              ({savedItemsCount} {dict.history.itemCount})
            </span>
          </h2>
          {/* Saved Items */}
          {histories.length === 0 ? (
            <div className="text-center py-10 text-gray-500">{dict.history.noHistory}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {histories.filter(history => !history.exploreId).map((history) => (
                <div
                  key={history._id}
                  className="relative bg-white rounded-2xl shadow-lg overflow-hidden group w-60 h-80 mx-auto"
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={history.imageUrl}
                      alt={history.description || dict.history.noDescription}
                      fill
                      className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQrJyEwPENBLzMzLy0zPVBCR0JHMz1DcWl5VGR2h4iIl5eXqqqq+vr6////2wBDAR"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === history._id ? null : history._id);
                          }}
                          className="text-white hover:text-gray-800 px-2 py-1 rounded"
                        >
                          •••
                        </button>
                        {activeDropdown === history._id && (
                          <div className="absolute right-0 top-full mt-1 w-30 bg-black shadow-lg rounded-lg z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlelocation(history);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50 flex items-center"
                            >
                              <i className="fas fa-share mr-2"></i>
                              {actionInProgress[history._id] === 'posting' ? dict.history.actions.posting : dict.history.actions.post}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(history);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50 flex items-center"
                              disabled={!!actionInProgress[history._id]}
                            >
                              <i className="fas fa-edit mr-2"></i>
                              {dict.history.actions.edit}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(history._id);
                                setActiveDropdown(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50 flex items-center"
                              disabled={!!actionInProgress[history._id]}
                            >
                              <i className="fas fa-trash mr-2"></i>
                              {actionInProgress[history._id] === 'deleting' ? dict.history.actions.deleting : dict.history.actions.delete}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div 
                      className="absolute bottom-0 left-0 w-full text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        backgroundImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))',
                      }}
                    >
                      <p className="text-lg font-semibold text-white">
                        {
                          CURRENCIES.find((c: Currency) => c.value === history.currency)?.symbol || 
                          history.currency
                        } {history.price || 'N/A'}
                      </p>
                      <p className="text-sm mt-1">{history.description || dict.history.noDescription}</p>
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
        
        <div
          ref={postedItemsRef}
          className={`mt-6 transition-transform duration-300 ${
          activeTab === "posted" ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
            <span>{dict.history.postedItems}</span>
            <span className="ml-3 text-sm font-normal text-gray-500">
              ({postedHistories.length} {dict.history.itemCount})
            </span>
          </h2>
          {/* Posted Items */}
          {postedHistories.length === 0 ? (
            <div className="text-center py-10 text-white">{dict.history.noHistory}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {postedHistories.map((history) => (
                <div
                  key={history._id}
                  className="relative bg-white rounded-2xl shadow-lg overflow-hidden group w-60 h-80 mx-auto"
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={history.imageUrl}
                      alt={history.description || dict.history.noDescription}
                      fill
                      className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQrJyEwPENBLzMzLy0zPVBCR0JHMz1DcWl5VGR2h4iIl5eXqqqq+vr6////2wBDAR"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === history._id ? null : history._id);
                          }}
                          className="text-white hover:text-gray-800 px-2 py-1 rounded"
                        >
                          •••
                        </button>
                        {activeDropdown === history._id && (
                          <div className="absolute right-0 top-full mt-1 w-30 bg-black shadow-lg rounded-lg z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (history.exploreId) {
                                  handleUnpublish(history._id, history.exploreId);
                                }
                                setActiveDropdown(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50 flex items-center"
                              disabled={!!actionInProgress[history._id]}
                            >
                              <i className="fas fa-ban mr-2"></i>
                              {actionInProgress[history._id] === 'unpublishing' ? dict.history.actions.unpublishing : dict.history.actions.unpublish}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div 
                      className="absolute bottom-0 left-0 w-full text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        backgroundImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))',
                      }}
                    >
                      <p className="text-lg font-semibold text-white">
                        {
                          CURRENCIES.find((c: Currency) => c.value === history.currency)?.symbol || 
                          history.currency
                        } {history.price || 'N/A'}
                      </p>
                      <p className="text-sm mt-1">{history.description || dict.history.noDescription}</p>
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
      </div>

      <div>
        <Modal 
          title={dict.history.locationModal.title}
          message={dict.history.locationModal.message}
          isOpen={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            handlePostWithoutLocation();
          }}
          onConfirm={handlePostWithLocation}
          confirmText={dict.history.locationModal.allow}
          cancelText={dict.history.locationModal.deny}
        />
        <LocationOptionModal
          isOpen={showLocationOptionModal}
          onClose={() => setShowLocationOptionModal(false)}
          onUseCurrentLocation={handleSetLocation}
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
    </div>
  );
}