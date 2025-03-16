'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from '@/lib/hooks/useHistory';
import { HistoryItem, DealingItem } from '@/lib/types/history';
import { useSession } from 'next-auth/react'; // To fetch user session data
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import Toast from '@/components/shared/Toast';
import { useProfilePage } from '@/lib/hooks/useProfilePage'; // Import the custom hook
import { CURRENCIES, Currency } from '@/components/main/CreatePost'; // Import types and data
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import Loading from '@/components/shared/Loading';
import ItemDetailModal from '@/components/shared/ItemDetailModal';
import { useRouter } from 'next/navigation';
import ToExplore from '@/components/shared/ToExplore';
import { useToExplore } from '@/lib/hooks/useToExplore';

interface HistoryProps {
  histories: HistoryItem[];
}

export default function History({ histories: initialHistories }: HistoryProps) {
  const {
    histories,
    setHistories,
    isLoading,
    error,
    formData,
    deleteHistory,
    updateHistory,
    locationPermission,
    handleLocationPermission,
  } = useHistory(initialHistories);

  const { unpublishFromExplore, isSaving: isUnpublishing } = useToExplore();

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const { data: session } = useSession();
  const userId = session?.user?.id || '';
  const userEmail = session?.user?.email || '';
  const emailInitial = userEmail.charAt(0).toUpperCase();
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { fetchProfileData } = useProfilePage(userId);
  const [activeTab, setActiveTab] = useState<'saved' | 'posted' | 'dealing'>('saved');
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const [savedItemsHeight, setSavedItemsHeight] = useState<number>(0);
  const [postedItemsHeight, setPostedItemsHeight] = useState<number>(0);
  const [dealingItemsHeight, setDealingItemsHeight] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const savedItemsRef = useRef<HTMLDivElement>(null);
  const postedItemsRef = useRef<HTMLDivElement>(null);
  const dealingItemsRef = useRef<HTMLDivElement>(null);
  const [postedHistories, setPostedHistories] = useState<HistoryItem[]>([]);
  const [dealingHistories, setDealingHistories] = useState<DealingItem[]>([]);
  const [isDealingLoading, setIsDealingLoading] = useState(false);
  const savedItemsCount = histories.filter(history => {
    const isPosted = history.exploreId !== undefined;
    const isDealing = dealingHistories.some(deal => deal._id === history._id);
    return !isPosted && !isDealing;
  }).length;

  const router = useRouter();
  const currentUserId = session?.user?.id || '';

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch(`/api/editprofile`);
          if (!response.ok) {
            throw new Error(`Failed to fetch user profile: ${response.statusText}`);
          }
          const profiles = await response.json();
          const userProfile = profiles.find(
            (profile: { email: string }) => profile.email === session.user?.email
          );
          
          // Set avatar URL
          if (userProfile?.avatarUrl) {
            setAvatarUrl(userProfile.avatarUrl);
          } else {
            setAvatarUrl(null);
          }
          
          // Set user name in state
          if (userProfile?.name) {
            setUserName(userProfile.name);
          } else {
            setUserName(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setAvatarUrl(null);
          setUserName(null);
        }
      }
    };
    fetchUserProfile();
  }, [session?.user?.email]);

  useEffect(() => {
    // Measure the height of the active tab's content
    const updateHeight = () => {
      if (activeTab === 'saved' && savedItemsRef.current) {
        setContainerHeight(savedItemsRef.current.offsetHeight);
      } else if (activeTab === 'posted' && postedItemsRef.current) {
        setContainerHeight(postedItemsRef.current.offsetHeight);
      } else if (activeTab === 'dealing' && dealingItemsRef.current) {
        setContainerHeight(dealingItemsRef.current.offsetHeight);
      }
    };

    // Add a small delay to ensure the content has rendered
    const timer = setTimeout(updateHeight, 100);

    // Recalculate height on window resize
    window.addEventListener('resize', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      clearTimeout(timer);
    };
  }, [activeTab, histories]);

  useEffect(() => {
    const posted = histories.filter(history => history.exploreId);
    setPostedHistories(posted);
  }, [histories]);

  useEffect(() => {
    const fetchDealingItems = async () => {
      if (!session?.user?.email) return;
      
      setIsDealingLoading(true);
      try {
        const response = await fetch('/api/chat/deal');
        if (!response.ok) {
          throw new Error('Failed to fetch dealing items');
        }
        const data = await response.json();
        setDealingHistories(data);
      } catch (error) {
        console.error('Error fetching dealing items:', error);
        showNewToast(
          error instanceof Error ? error.message : 'Failed to fetch dealing items',
          'error'
        );
      } finally {
        setIsDealingLoading(false);
      }
    };

    fetchDealingItems();
  }, [session?.user?.email]);

  const handleTabChange = (tab: 'saved' | 'posted' | 'dealing') => {
    if (tab !== activeTab) {
      setTransitionDirection(
        tab === 'saved' ? 'left' : 
        tab === 'posted' ? (activeTab === 'dealing' ? 'left' : 'right') : 
        tab === 'dealing' ? 'right' : 
        'right'
      );
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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<HistoryItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

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

  const handleOpenCard = useCallback((item: HistoryItem) => {
    setSelectedCard({
      ...item,
      userProfile: {
        _id: userId,
        name: userName || session?.user?.name || '',
        avatarUrl: avatarUrl || ''
      }
    });
    setCurrentImageIndex(0);
  }, [userId, userName, session?.user?.name, avatarUrl]);

  const handlePrevImage = useCallback(() => {
    if (!selectedCard?.images?.length) return;
    const images = selectedCard.images;
    setCurrentImageIndex((prev) => 
      (prev - 1 + images.length) % images.length
    );
  }, [selectedCard]);

  const handleNextImage = useCallback(() => {
    if (!selectedCard?.images?.length) return;
    const images = selectedCard.images;
    setCurrentImageIndex((prev) => 
      (prev + 1) % images.length
    );
  }, [selectedCard]);

  const handleGetDirections = useCallback(
    (lat: number, lng: number) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            window.open(
              `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${lat},${lng}`,
              '_blank'
            );
          },
          (err) => {
            console.error('Error fetching location:', err);
            alert('Enable location to get directions');
          }
        );
      } else {
        alert('Geolocation not supported');
      }
    },
    []
  );

  const handleSendMessage = useCallback(
    (userId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!userId) return;
      if (currentUserId === userId) return;
      router.push(`/chat/${userId}`);
    },
    [router, currentUserId]
  );

  const handleAvatarClick = useCallback(
    (userId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!userId) return;
      if (currentUserId === userId) return;
      router.push(`/chat/${userId}`);
    },
    [router, currentUserId]
  );

  const handleUnpublish = async (historyId: string, exploreId: string) => {
    try {
      setActionInProgress({...actionInProgress, [historyId]: 'unpublishing'});
      await unpublishFromExplore(historyId, exploreId);
      
      // 更新本地状态
      setHistories(prev =>
        prev.map(h =>
          h._id === historyId
            ? { ...h, exploreId: undefined }
            : h
        )
      );
      
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

  const handleUpdateDealingStatus = async (dealingId: string, status: 'completed' | 'cancelled') => {
    try {
      const response = await fetch(`/api/chat/deal/${dealingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update dealing status');
      }

      // 更新本地状态
      setDealingHistories(prev => 
        prev.map(item => 
          item.dealingId === dealingId ? { ...item, status } : item
        )
      );

      showNewToast(
        `Successfully ${status} the deal!`,
        'success'
      );
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : 'Failed to update dealing status',
        'error'
      );
    }
  };

  if (error) {
    return <div className="text-center py-10 text-red-500">Error loading history</div>;
  }

  if (isLoading) {
    return <Loading text="Loading history..." />;
  }

  console.log('Avatar URL:', formData.avatarUrl);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-10"></h1>
      {/* Header Section */}
      <div className="relative flex flex-col items-center">
        <div className="relative w-[150px] h-[150px] rounded-full overflow-hidden">
          {avatarUrl ? (
            <ImageWithFallback
              src={avatarUrl}
              alt={userName || session?.user?.name || emailInitial}
              fill
              style={{ objectFit: "cover" }}
              isAvatar={true}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-purple-600 text-white text-6xl">
              {userName ? userName[0].toUpperCase() : session?.user?.name ? session.user.name[0].toUpperCase() : emailInitial}
            </div>
          )}
        </div>
        <h1 className="text-2xl text-white font-bold mt-4">{userName || session?.user?.name || emailInitial}</h1>
        <p className="text-sm text-gray-400 mt-2">{userId || 'N/A'}</p>
        <button
          onClick={() => {
            window.location.href = '/editprofile';
          }}
          className="mt-4 px-4 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-300 transition duration-200"
        >
          Edit Profile
        </button>
      </div>

      {/* Tab Controls */}
      <div className="mt-4 flex justify-center space-x-4">
        <button
          onClick={() => handleTabChange('saved')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'saved' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-black'}`}
        >
          Saved Items
        </button>
        <button
          onClick={() => handleTabChange('posted')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'posted' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-black'}`}
        >
          Posted Items
        </button>
        <button
          onClick={() => handleTabChange('dealing')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 ${activeTab === 'dealing' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-black'}`}
        >
          Dealing Items
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
            <span>Saved Items</span>
            <span className="ml-3 text-sm font-normal text-gray-500">
              ({savedItemsCount} items)
            </span>
          </h2>
          {/* Saved Items */}
          {histories.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No saved items</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {histories
                .filter(history => {
                  const isPosted = history.exploreId !== undefined;
                  const isDealing = dealingHistories.some(deal => deal._id === history._id);
                  return !isPosted && !isDealing;
                })
                .map((history) => (
                  <div
                    key={history._id}
                    className="relative bg-white rounded-2xl shadow-lg overflow-hidden group w-60 h-80 mx-auto cursor-pointer"
                    onMouseLeave={() => setActiveDropdown(null)}
                    onClick={() => handleOpenCard(history)}
                  >
                    <div className="relative w-full h-full">
                      {/* Primary Image */}
                      <Image
                        src={
                          history.images 
                            ? (history.images.find(img => img.isPrimary)?.url || history.images[0]?.url || '/fallback.jpg')
                            : history.imageUrl || '/fallback.jpg'
                        }
                        alt={history.description || 'No description available'}
                        fill
                        style={{ objectFit: "cover" }}
                        className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                      />
                      
                      {/* Thumbnail Navigation */}
                      {history.images && history.images.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                          {history.images.map((image, index) => (
                            <div
                              key={image.id}
                              className={`w-2 h-2 rounded-full ${
                                image.isPrimary ? 'bg-white' : 'bg-gray-400'
                              }`}
                            />
                          ))}
                        </div>
                      )}

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
                              <ToExplore
                                history={history}
                                locationPermission={locationPermission}
                                onLocationPermissionChange={handleLocationPermission}
                                onSuccess={() => {
                                  showNewToast('Successfully posted to explore!', 'success');
                                  setActiveDropdown(null);
                                }}
                              >
                                {({ handlePost, isPosting }) => (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePost();
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50 flex items-center"
                                    disabled={isPosting}
                                  >
                                    <i className="fas fa-share mr-2"></i>
                                    {isPosting ? 'Posting...' : 'Post to Explore'}
                                  </button>
                                )}
                              </ToExplore>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(history._id);
                                  setActiveDropdown(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50 flex items-center"
                              >
                                <i className="fas fa-trash mr-2"></i>
                                {actionInProgress[history._id] === 'deleting' ? 'Deleting...' : 'Delete'}
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
        
        {/* Posted Items Section */}
        <div
          ref={postedItemsRef}
          className={`absolute w-full transition-transform duration-300 ${
            activeTab === "posted" ? "translate-x-0" : activeTab === "saved" ? "translate-x-full" : "-translate-x-full"
          }`}
          style={{ 
            transform: activeTab === "posted" ? "translateX(0)" : activeTab === "saved" ? "translateX(100%)" : "translateX(-100%)",
            opacity: activeTab === "posted" ? 1 : 0,
            visibility: activeTab === "posted" ? "visible" : "hidden"
          }}
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center text-white">
            <span>Posted Items</span>
            <span className="ml-3 text-sm font-normal text-gray-500">
              ({postedHistories.length} items)
            </span>
          </h2>
          {/* Posted Items Content */}
          {postedHistories.length === 0 ? (
            <div className="text-center text-white py-10">No posted items</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {postedHistories.map((history) => (
                <div
                  key={history._id}
                  className="relative bg-white rounded-2xl shadow-lg overflow-hidden group w-60 h-80 mx-auto cursor-pointer"
                  onMouseLeave={() => setActiveDropdown(null)}
                  onClick={() => handleOpenCard(history)}
                >
                  <div className="relative w-full h-full">
                    {/* Primary Image */}
                    <Image
                      src={
                        history.images 
                          ? (history.images.find(img => img.isPrimary)?.url || history.images[0]?.url || '/fallback.jpg')
                          : history.imageUrl || '/fallback.jpg'
                      }
                      alt={history.description || 'No description available'}
                      fill
                      style={{ objectFit: "cover" }}
                      className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                    />
                    
                    {/* Thumbnail Navigation */}
                    {history.images && history.images.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                        {history.images.map((image, index) => (
                          <div
                            key={image.id}
                            className={`w-2 h-2 rounded-full ${
                              image.isPrimary ? 'bg-white' : 'bg-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}

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
                              {actionInProgress[history._id] === 'unpublishing' ? 'Unpublishing...' : 'Unpublish'}
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

        {/* Dealing Items Section */}
        <div
          ref={dealingItemsRef}
          className={`absolute w-full transition-transform duration-300 ${
            activeTab === "dealing" ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ 
            transform: activeTab === "dealing" ? "translateX(0)" : "translateX(100%)",
            opacity: activeTab === "dealing" ? 1 : 0,
            visibility: activeTab === "dealing" ? "visible" : "hidden"
          }}
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center text-white">
            <span>Dealing Items</span>
            <span className="ml-3 text-sm font-normal text-gray-500">
              ({dealingHistories.length} items)
            </span>
          </h2>

          {isDealingLoading ? (
            <Loading text="Loading dealing items..." />
          ) : dealingHistories.length === 0 ? (
            <div className="text-center text-white py-10">No dealing items</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {dealingHistories.map((item) => (
                <div
                  key={item._id}
                  className="relative bg-white rounded-2xl shadow-lg overflow-hidden group w-60 h-80 mx-auto cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={item.imageUrl || '/fallback.jpg'}
                      alt={item.description || 'No description available'}
                      fill
                      style={{ objectFit: "cover" }}
                      className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                    />
                    
                    {/* Status Badge */}
                    <div
                      className={`absolute top-2 left-2 px-3 py-1 rounded-full text-sm font-medium ${
                        item.role === 'buying' ? 'bg-blue-500' : 'bg-green-500'
                      } text-white shadow-lg`}
                    >
                      {item.role === 'buying' ? 'Buyer' : 'Seller'}
                    </div>

                    {/* Deal Status */}
                    <div
                      className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-medium ${
                        item.status === 'pending'
                          ? 'bg-yellow-500'
                          : item.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      } text-white shadow-lg`}
                    >
                      {item.status}
                    </div>

                    {/* Item Details */}
                    <div
                      className="absolute bottom-0 left-0 w-full text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        backgroundImage:
                          'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))',
                        padding: '20px',
                      }}
                    >
                      <p className="text-lg font-semibold text-white mb-2">
                        {CURRENCIES.find((c: Currency) => c.value === item.currency)?.symbol || item.currency}{' '}
                        {item.price || 'N/A'}
                      </p>
                      <p className="text-sm mb-2">
                        {item.description || 'No description available'}
                      </p>
                      <p className="text-xs text-gray-300 mb-3">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : 'Date not available'}
                      </p>

                      {/* Action Buttons (only if status is pending) */}
                      {item.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateDealingStatus(item.dealingId, 'completed');
                            }}
                            className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            Complete
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateDealingStatus(item.dealingId, 'cancelled');
                            }}
                            className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <Toast 
          message={toastMessage}
          isVisible={showToast}
          onClose={() => setShowToast(false)}
          type={toastType}
          duration={2000}
        />
      </div>

      <AnimatePresence>
        {selectedCard && (
          <ItemDetailModal
            item={selectedCard}
            currentImageIndex={currentImageIndex}
            onClose={() => setSelectedCard(null)}
            onPrevImage={handlePrevImage}
            onNextImage={handleNextImage}
            onAvatarClick={handleAvatarClick}
            onSendMessage={handleSendMessage}
            onGetDirections={handleGetDirections}
            currentUserId={currentUserId}
            onUpdate={async (id, updates) => {
              await updateHistory(id, updates);
              // Update both histories and selectedCard
              const updatedHistories = histories.map(h => 
                h._id === id ? { ...h, ...updates } : h
              );
              setHistories(updatedHistories);
              
              // Update postedHistories immediately
              const updatedPostedHistories = updatedHistories.filter(history => history.exploreId);
              setPostedHistories(updatedPostedHistories);
              
              // Update the selectedCard to reflect changes immediately
              setSelectedCard(prev => prev ? { ...prev, ...updates } : null);
              
              showNewToast('Successfully updated!', 'success');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}