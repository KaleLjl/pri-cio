import React from 'react';
import { ExploreItem } from '@/lib/types/explore';
import ImageWithFallback from './ImageWithFallback';
import { CURRENCIES } from '@/components/main/App';
import { useLanguage } from '@/lib/context/LanguageContext';

interface ObjectDiscussionProps {
  post: ExploreItem;
  initialValues?: {
    price: string;
    location: string;
    meetingTime: string;
  };
  onClose: () => void;
  onSubmit: (data: {
    price: string;
    location: string;
    meetingTime: string;
  }) => void;
}

export default function ObjectDiscussion({ 
  post, 
  initialValues,
  onClose, 
  onSubmit 
}: ObjectDiscussionProps) {
  const { dict } = useLanguage();
  const [price, setPrice] = React.useState(initialValues?.price || post.price);
  const [location, setLocation] = React.useState(
    initialValues?.location || (post.location ? `${post.location.city}, ${post.location.country}` : '')
  );
  const [meetingTime, setMeetingTime] = React.useState(initialValues?.meetingTime || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      price,
      location,
      meetingTime,
    });
  };

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-4">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <ImageWithFallback
            src={post.imageUrl}
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

          <form onSubmit={handleSubmit} className="space-y-3">
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
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
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
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 bg-gray-700/50 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={dict.objectDiscussion.enterLocation}
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
                onChange={(e) => setMeetingTime(e.target.value)}
                className="flex-1 bg-gray-700/50 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                min={new Date().toISOString().slice(0, 16)}
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