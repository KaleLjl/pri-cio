import React, { useEffect } from 'react';
import ImageWithFallback from '../../../shared/ImageWithFallback';
import { CURRENCIES } from '@/components/main/CreatePost';
import { useLanguage } from '@/context/LanguageContext';
import { useObjectDiscussion } from '@/hooks/chat/useObjectDiscussion';
import { ObjectDiscussionProps } from '@/lib/types/objectDiscussion';

export default function ObjectDiscussion({ 
  post, 
  initialValues,
  onClose, 
  onSubmit 
}: ObjectDiscussionProps) {
  const { dict } = useLanguage();
  
  const {
    price,
    location,
    meetingTime,
    handlePriceChange,
    handleLocationChange,
    handleMeetingTimeChange,
    handleFormSubmit,
    getPrimaryImage,
    initializeFormValues
  } = useObjectDiscussion({
    currentUserId: '',
    messages: [],
    sendMessage: async () => {},
  });

  useEffect(() => {
    initializeFormValues(
      initialValues?.price || post.price,
      initialValues?.location || (post.location ? `${post.location.city}, ${post.location.country}` : ''),
      initialValues?.meetingTime || ''
    );
  }, [initialValues, post]);

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-4">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <ImageWithFallback
            src={getPrimaryImage(post.images)}
            alt={post.description}
            fill
            className="object-cover rounded-lg"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Description */}
          <p className="text-sm text-gray-300 mb-2 line-clamp-2">
            {post.description}
          </p>

          <form onSubmit={(e) => handleFormSubmit(e, onSubmit)} className="space-y-3">
            {/* Price */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">
                {dict.objectDiscussion.price}:
              </span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {CURRENCIES.find(c => c.value === post.currency)?.symbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={handlePriceChange}
                  className="w-full bg-gray-700/50 rounded-lg pl-8 pr-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={dict.objectDiscussion.enterPrice}
                />
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">
                {dict.objectDiscussion.location}:
              </span>
              <input
                type="text"
                value={location}
                onChange={handleLocationChange}
                className="flex-1 bg-gray-700/50 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={dict.objectDiscussion.enterLocation}
                required
              />
            </div>

            {/* Meeting Time */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">
                {dict.objectDiscussion.meetingTime}:
              </span>
              <input
                type="datetime-local"
                value={meetingTime}
                onChange={handleMeetingTimeChange}
                className="flex-1 bg-gray-700/50 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 mt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 text-sm text-gray-300 hover:text-white transition-colors"
              >
                {dict.objectDiscussion.cancel}
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
              >
                {dict.objectDiscussion.send}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 