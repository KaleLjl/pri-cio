import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import ImageWithFallback from './ImageWithFallback';
import { CURRENCIES } from '@/components/main/CreatePost';

interface ItemDetailModalProps {
  item: {
    _id: string;
    images?: { id: string; url: string; isPrimary: boolean; }[];
    imageUrl?: string;
    description: string;
    createdAt?: string;
    price: string;
    currency: string;
    exploreId?: string;
    location?: {
      latitude: number;
      longitude: number;
      city?: string;
      country?: string;
    };
    userProfile?: {
      _id?: string;
      avatarUrl?: string;
      name?: string;
    };
  };
  currentImageIndex: number;
  onClose: () => void;
  onPrevImage: () => void;
  onNextImage: () => void;
  onAvatarClick?: (userId: string, e: React.MouseEvent) => void;
  onSendMessage?: (userId: string, e: React.MouseEvent) => void;
  onGetDirections?: (lat: number, lng: number) => void;
  currentUserId?: string;
  onUpdate?: (id: string, updates: { price: string; description: string }) => Promise<void>;
}

export default function ItemDetailModal({
  item,
  currentImageIndex,
  onClose,
  onPrevImage,
  onNextImage,
  onAvatarClick,
  onSendMessage,
  onGetDirections,
  currentUserId,
  onUpdate,
}: ItemDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(item.price);
  const [editDescription, setEditDescription] = useState(item.description);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAvatarClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (item.userProfile?._id && onAvatarClick) {
        onAvatarClick(item.userProfile._id, e);
      }
    },
    [item.userProfile?._id, onAvatarClick]
  );

  const handleSendMessage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (item.userProfile?._id && onSendMessage) {
        onSendMessage(item.userProfile._id, e);
      }
    },
    [item.userProfile?._id, onSendMessage]
  );

  const handleGetDirections = useCallback(() => {
    if (item.location && onGetDirections) {
      onGetDirections(item.location.latitude, item.location.longitude);
    }
  }, [item.location, onGetDirections]);

  const handleUpdate = async () => {
    if (!onUpdate) return;
    
    try {
      setIsUpdating(true);
      await onUpdate(item._id, {
        price: editPrice,
        description: editDescription,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const isOwnItem = currentUserId === item.userProfile?._id;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="bg-black rounded-2xl shadow-xl w-[90%] max-w-4xl p-8 text-black"
      >
        <div className="grid" style={{ gridTemplateColumns: '500px auto', gap: '1.5rem' }}>
          {/* LEFT Column: 500x500 image, arrows inside */}
          <div className="relative w-[500px] h-[500px] bg-white rounded-lg overflow-hidden">
            {((item.images && item.images.length > 0) || item.imageUrl) ? (
              <>
                <ImageWithFallback
                  src={
                    item.images
                      ? item.images[currentImageIndex]?.url
                      : item.imageUrl
                  }
                  alt={item.description || 'No description available'}
                  fill
                  style={{ objectFit: 'contain', backgroundColor: 'black' }}
                />
                {/* Arrows inside the image box */}
                {item.images && item.images.length > 1 && (
                  <>
                    <button
                      onClick={onPrevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/40 text-white p-2 rounded-r hover:bg-black/70"
                    >
                      ◀
                    </button>
                    <button
                      onClick={onNextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/40 text-white p-2 rounded-r hover:bg-black/70"
                    >
                      ▶
                    </button>
                  </>
                )}
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
                  onClick={handleAvatarClick}
                >
                  <ImageWithFallback
                    src={item.userProfile?.avatarUrl || ''}
                    alt={item.userProfile?.name || 'Anonymous'}
                    layout="fill"
                    objectFit="cover"
                    isAvatar
                  />
                </div>
                <span className="font-semibold text-white">
                  {item.userProfile?.name || 'Anonymous'}
                </span>
              </div>
              {isOwnItem && onUpdate && !item.exploreId && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="text"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-white">
                  {CURRENCIES.find((c) => c.value === item.currency)?.symbol}{' '}
                  {item.price || ''}
                </p>
                <h2 className="text-lg text-white">
                  {item.description || 'No description available'}
                </h2>
                <p className="text-gray-600 text-sm">
                  Created at:{' '}
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                </p>
                {item?.location && (
                  <p className="text-gray-600">
                    Location: {item.location.city}, {item.location.country}
                  </p>
                )}
              </>
            )}

            <div className="flex-1" />

            {/* Buttons at the bottom */}
            {item.location && !isEditing && (
              <div className="flex flex-col justify-end flex-grow">
                <div className="border-t border-gray-600 pt-4 flex justify-between space-x-4">
                  {/* Directions */}
                  <button
                    onClick={handleGetDirections}
                    className="flex-1 inline-flex items-center justify-center p-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    aria-label="Get directions"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-8 w-8"
                    >
                      <path
                        d="M12 21.25C11.7623 21.25 11.5269 21.2033 11.3073 21.1123C11.0877 21.0214 10.8881 20.8881 10.72 20.72L3.28 13.28C3.11188 13.1119 2.97853 12.9124 2.88754 12.6928C2.79656 12.4731 2.74973 12.2377 2.74973 12C2.74973 11.7623 2.79656 11.5269 2.88754 11.3073C2.97853 11.0876 3.11188 10.8881 3.28 10.72L10.72 3.28001C11.0656 2.95224 11.5237 2.76953 12 2.76953C12.4763 2.76953 12.9344 2.95224 13.28 3.28001L20.72 10.72C20.8881 10.8881 21.0215 11.0876 21.1125 11.3073C21.2034 11.5269 21.2503 11.7623 21.2503 12C21.2503 12.2377 21.2034 12.4731 21.1125 12.6928C21.0215 12.9124 20.8881 13.1119 20.72 13.28L13.28 20.72C13.1119 20.8881 12.9123 21.0214 12.6927 21.1123C12.4731 21.2033 12.2377 21.25 12 21.25ZM12 4.25001C11.9605 4.24875 11.9213 4.25616 11.885 4.27171C11.8487 4.28726 11.8163 4.31057 11.79 4.34001L4.34 11.79C4.31156 11.8171 4.28892 11.8497 4.27345 11.8858C4.25798 11.9219 4.25 11.9607 4.25 12C4.25 12.0393 4.25798 12.0782 4.27345 12.1143C4.28892 12.1503 4.31156 12.1829 4.34 12.21L11.79 19.66C11.8127 19.6951 11.8438 19.7239 11.8804 19.7439C11.9171 19.7639 11.9582 19.7744 12 19.7744C12.0418 19.7744 12.0829 19.7639 12.1196 19.7439C12.1562 19.7239 12.1873 19.6951 12.21 19.66L19.66 12.21C19.6884 12.1829 19.7111 12.1503 19.7266 12.1143C19.742 12.0782 19.75 12.0393 19.75 12C19.75 11.9607 19.742 11.9219 19.7266 11.8858C19.7111 11.8497 19.6884 11.8171 19.66 11.79L12.21 4.34001C12.1837 4.31057 12.1513 4.28726 12.115 4.27171C12.0787 4.25616 12.0395 4.24875 12 4.25001Z" fill="currentColor"/>
                      <path d="M13.27 14.42C13.1714 14.4205 13.0738 14.4013 12.9828 14.3635C12.8918 14.3257 12.8092 14.2701 12.74 14.2C12.5995 14.0594 12.5207 13.8688 12.5207 13.67C12.5207 13.4713 12.5995 13.2807 12.74 13.14L14.44 11.46L12.74 9.78003C12.6663 9.71137 12.6072 9.62857 12.5662 9.53657C12.5252 9.44457 12.5032 9.34526 12.5014 9.24455C12.4996 9.14385 12.5181 9.04382 12.5559 8.95043C12.5936 8.85705 12.6497 8.77221 12.721 8.70099C12.7922 8.62978 12.877 8.57363 12.9704 8.53591C13.0638 8.49819 13.1638 8.47966 13.2645 8.48144C13.3652 8.48322 13.4645 8.50526 13.5565 8.54625C13.6485 8.58724 13.7313 8.64635 13.8 8.72003L16 10.93C16.071 10.9998 16.1275 11.0831 16.166 11.175C16.2045 11.2668 16.2244 11.3654 16.2244 11.465C16.2244 11.5646 16.2045 11.6633 16.166 11.7551C16.1275 11.847 16.071 11.9302 16 12L13.8 14.2C13.7307 14.2701 13.6482 14.3257 13.5572 14.3635C13.4662 14.4013 13.3685 14.4205 13.27 14.42Z" fill="currentColor"/>
                      <path d="M8.5 15C8.30189 14.9974 8.11263 14.9176 7.97253 14.7775C7.83244 14.6374 7.75259 14.4481 7.75 14.25V11.46C7.75259 11.2619 7.83244 11.0727 7.97253 10.9326C8.11263 10.7925 8.30189 10.7126 8.5 10.71H15.5C15.6989 10.71 15.8897 10.789 16.0303 10.9297C16.171 11.0703 16.25 11.2611 16.25 11.46C16.25 11.6589 16.171 11.8497 16.0303 11.9904C15.8897 12.131 15.6989 12.21 15.5 12.21H9.25V14.21C9.25402 14.3115 9.23766 14.4127 9.20189 14.5078C9.16613 14.6028 9.11168 14.6897 9.04177 14.7633C8.97185 14.837 8.88789 14.8959 8.79484 14.9365C8.70179 14.9772 8.60154 14.9988 8.5 15Z" fill="currentColor"/>
                    </svg>
                  </button>

                  {/* Send message (if not your own post) */}
                  {currentUserId !== item.userProfile?._id && (
                    <button
                      onClick={handleSendMessage}
                      className="flex-1 inline-flex items-center justify-center p-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      aria-label="Send message"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
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
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 