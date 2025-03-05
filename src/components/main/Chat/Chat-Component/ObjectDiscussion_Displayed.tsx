import React from 'react';
import { ObjectDiscussionData } from '@/lib/types/chat';
import ImageWithFallback from '../../../shared/ImageWithFallback';
import { CURRENCIES } from '@/components/main/CreatePost';
import { useLanguage } from '@/lib/context/LanguageContext';
import { ExploreItem } from '@/lib/types/explore';

interface ObjectDiscussionDisplayedProps {
  content: ObjectDiscussionData;
  senderId: string;
  currentUserId: string;
  myPosts: ExploreItem[];
  userPosts: ExploreItem[];
  isLastDiscussionMessage: (message: any, messages: any[]) => boolean;
  isPostFinalized: (postId: string, discussingId: string, messages: any[]) => boolean;
  isCurrentUserSeller: (postId: string, myPosts: ExploreItem[], userPosts: ExploreItem[]) => boolean;
  handleObjectDiscussionClick: (content: ObjectDiscussionData, senderId: string) => void;
  handleDealComplete: (content: ObjectDiscussionData, senderId: string) => void;
  handleCancelDiscussion: (content: ObjectDiscussionData, senderId: string) => void;
  isSending: boolean;
  messages: any[];
}

export default function ObjectDiscussion_Displayed({
  content,
  senderId,
  currentUserId,
  myPosts,
  userPosts,
  isLastDiscussionMessage,
  isPostFinalized,
  isCurrentUserSeller,
  handleObjectDiscussionClick,
  handleDealComplete,
  handleCancelDiscussion,
  isSending,
  messages
}: ObjectDiscussionDisplayedProps) {
  const { dict } = useLanguage();
  
  const actualMessage = messages.find(msg => 
    typeof msg.content !== 'string' && 
    msg.content.type === 'object_discussion' && 
    msg.content.discussingId === content.discussingId
  );
  
  const message = { 
    content, 
    senderId, 
    _id: actualMessage?._id || '' 
  };

  return (
    <div 
      className={`space-y-3 max-w-sm ${
        content.status === 'discussing' ? 'cursor-pointer' : 'cursor-default'
      } hover:opacity-90 transition-opacity ${
        isPostFinalized(
          content.postId,
          content.discussingId || '',
          messages
        ) ? 'opacity-50' : ''
      }`}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') {
          return;
        }
        if (content.status === 'discussing') {
          handleObjectDiscussionClick(content, senderId);
        }
      }}
    >
      <div className="flex items-start space-x-3">
        <div className="relative w-20 h-20 flex-shrink-0">
          <div className="absolute -top-2 -left-2 z-10">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              isCurrentUserSeller(content.postId, myPosts, userPosts) ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
            }`}>
              {isCurrentUserSeller(content.postId, myPosts, userPosts)
                ? dict.objectDiscussion?.sellerLabel 
                : dict.objectDiscussion?.buyerLabel}
            </span>
          </div>
          <ImageWithFallback
            src={content.imageUrl}
            alt={content.description}
            fill
            className={`object-cover rounded-lg ${
              isPostFinalized(
                content.postId,
                content.discussingId || '',
                messages
              ) ? 'grayscale' : ''
            } ${
              isCurrentUserSeller(content.postId, myPosts, userPosts) ? 'ring-2 ring-blue-500' : 'ring-2 ring-orange-500'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300 line-clamp-2 mb-2">
            {content.description}
          </p>
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center text-gray-300">
              <span className="text-gray-400 w-20">{dict.objectDiscussion?.price}:</span>
              <span className={`ml-1 truncate ${
                isCurrentUserSeller(content.postId, myPosts, userPosts) ? 'text-blue-400' : 'text-orange-400'
              }`}>
                {CURRENCIES.find(c => c.value === content.currency)?.symbol}
                {content.suggestedPrice}
              </span>
              {content.suggestedPrice !== content.originalPrice && (
                <span className="ml-2 text-xs text-gray-400 truncate">
                  (Original: {CURRENCIES.find(c => c.value === content.currency)?.symbol}
                  {content.originalPrice})
                </span>
              )}
            </p>
            <p className="flex items-center text-gray-300">
              <span className="text-gray-400 w-20">{dict.objectDiscussion?.location}:</span>
              <span className="ml-1 truncate">{content.location}</span>
            </p>
            <p className="flex items-center text-gray-300">
              <span className="text-gray-400 w-20">{dict.objectDiscussion?.meetingTime}:</span>
              <span className="ml-1 truncate">
                {new Date(content.meetingTime).toLocaleString()}
              </span>
            </p>
          </div>
          
          {/* Action Buttons */}
          {content.status === 'discussing' &&
            isLastDiscussionMessage(message, messages) && (
            <div className="mt-3 flex space-x-2">
              {/* Deal button - only visible to the receiver */}
              {senderId !== currentUserId && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDealComplete(content, senderId);
                  }}
                  disabled={isSending}
                  className={`px-3 py-1 text-sm text-white rounded-lg transition-colors ${
                    isCurrentUserSeller(content.postId, myPosts, userPosts) 
                      ? 'bg-blue-500 hover:bg-blue-400' 
                      : 'bg-orange-500 hover:bg-orange-400'
                  } ${isSending ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isSending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {dict.chat?.status?.sending || 'Processing...'}
                    </span>
                  ) : (
                    dict.objectDiscussion?.complete || 'Complete'
                  )}
                </button>
              )}
              
              {/* Cancel button - visible to both parties */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelDiscussion(content, senderId);
                }}
                disabled={isSending}
                className={`px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-400 rounded-lg transition-colors ${
                  isSending ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                {isSending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {dict.chat?.status?.sending || 'Processing...'}
                  </span>
                ) : (
                  dict.objectDiscussion?.cancel || 'Cancel'
                )}
              </button>
            </div>
          )}

          {/* Status display */}
          {content.status !== 'discussing' && (
            <div className="mt-2">
              <span className={`text-sm ${
                content.status === 'completed' ? 'text-green-500' :
                'text-red-500'
              }`}>
                {content.status === 'completed' 
                  ? dict.objectDiscussion?.completed 
                  : dict.objectDiscussion?.canceled}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 