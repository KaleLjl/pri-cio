'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import { useChatContext } from '@/context/ChatContext';
import { useMessageActions } from '@/hooks/chat/useMessageActions';
import { useLanguage } from '@/context/LanguageContext';

const ChatHeader: React.FC = () => {
  const { dict } = useLanguage();
  const router = useRouter();
  
  // Get chat data from context
  const { currentUserId, otherUser, conversationId } = useChatContext();
  
  // Get message actions
  const { 
    deleteMessages,
    isDeleting
  } = useMessageActions({
    conversationId,
    currentUserId: currentUserId || undefined,
    otherUserId: otherUser?._id
  });

  // Handle delete messages
  const handleDeleteMessages = async () => {
    try {
      await deleteMessages();
      router.push('/chat');
    } catch (error) {
      console.error('Failed to delete messages:', error);
    }
  };

  // If required data is not available, don't render the component
  if (!otherUser?._id || !currentUserId || !conversationId) {
    return null;
  }

  return (
    <div className="p-4 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
            aria-label={dict.chat.actions.back}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div className="relative w-10 h-10 rounded-full overflow-hidden">
            <ImageWithFallback
              src={otherUser.avatarUrl}
              alt={otherUser.name || 'User'}
              width={40}
              height={40}
              className="object-cover"
              isAvatar={true}
              priority
            />
          </div>
          <div>
            <h2 className="font-semibold text-white">
              {otherUser.name || 'Unknown User'}
            </h2>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteMessages}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Delete conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader; 