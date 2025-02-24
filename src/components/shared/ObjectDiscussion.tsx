import React, { useState, useEffect } from 'react';
import { ExploreItem } from '@/lib/types/explore';
import ImageWithFallback from './ImageWithFallback';
import { CURRENCIES } from '@/components/main/CreatePost';
import { useLanguage } from '@/lib/context/LanguageContext';

interface ObjectDiscussionProps {
  post: {
    _id: string;
    images: Array<{
      id: string;
      url: string;
      isPrimary: boolean;
    }>;
    description: string;
    price: string;
    currency: string;
    historyId: string;
    location?: {
      city: string;
      country: string;
    };
  };
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
  
  // Add validation states
  const [errors, setErrors] = useState<{
    location?: string;
    meetingTime?: string;
  }>({});
  
  // Validation functions
  const isValidMeetingTime = (time: string): boolean => {
    if (!time) return false;
    const meetingDate = new Date(time);
    const now = new Date();
    return meetingDate > now;
  };

  const isValidLocation = (loc: string): boolean => {
    return Boolean(loc && loc.trim().length > 0);
  };
  
  // Validate on input change
  useEffect(() => {
    const newErrors: {location?: string; meetingTime?: string} = {};
    
    if (meetingTime && !isValidMeetingTime(meetingTime)) {
      newErrors.meetingTime = 'Meeting time must be in the future';
    }
    
    setErrors(newErrors);
  }, [meetingTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submitting
    const newErrors: {location?: string; meetingTime?: string} = {};
    
    if (!isValidLocation(location)) {
      newErrors.location = 'Location is required';
    }
    
    if (!isValidMeetingTime(meetingTime)) {
      newErrors.meetingTime = 'Meeting time must be in the future';
    }
    
    setErrors(newErrors);
    
    // Only submit if there are no errors
    if (Object.keys(newErrors).length === 0) {
      onSubmit({
        price,
        location,
        meetingTime,
      });
    }
  };

  const getPrimaryImage = (images: Array<{id: string, url: string, isPrimary: boolean}>) => {
    const primaryImage = images.find(img => img.isPrimary) || images[0];
    return primaryImage?.url || '';
  };
  
  // Check form validity for disabling the submit button
  const isFormValid = isValidLocation(location) && isValidMeetingTime(meetingTime);

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
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">
                  {dict.objectDiscussion.location}:
                </span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (e.target.value && isValidLocation(e.target.value)) {
                      setErrors({...errors, location: undefined});
                    }
                  }}
                  className={`flex-1 bg-gray-700/50 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 ${
                    errors.location ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-purple-500'
                  }`}
                  placeholder={dict.objectDiscussion.enterLocation}
                  required
                />
              </div>
              {errors.location && (
                <p className="text-xs text-red-500 ml-20">{errors.location}</p>
              )}
            </div>

            {/* Meeting Time */}
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">
                  {dict.objectDiscussion.meetingTime}:
                </span>
                <input
                  type="datetime-local"
                  value={meetingTime}
                  onChange={(e) => {
                    setMeetingTime(e.target.value);
                    if (e.target.value && isValidMeetingTime(e.target.value)) {
                      setErrors({...errors, meetingTime: undefined});
                    }
                  }}
                  className={`flex-1 bg-gray-700/50 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 ${
                    errors.meetingTime ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-purple-500'
                  }`}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>
              {errors.meetingTime && (
                <p className="text-xs text-red-500 ml-20">{errors.meetingTime}</p>
              )}
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
                disabled={!isFormValid}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  isFormValid
                    ? 'bg-purple-600 text-white hover:bg-purple-500'
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                }`}
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