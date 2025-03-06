'use client';
import React from 'react';
import { ChatProps } from '@/lib/types/chat';
import { ChatProvider, useChat } from '@/context/ChatContext';
import { SocketProvider } from '@/context/SocketContext';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { useMessageReception } from '@/hooks/chat/useMessageReception';
import Loading from '@/components/shared/Loading';
import ObjectDiscussion from '@/components/main/Chat/Chat-Component/ObjectDiscussion_Edit';
import ChatHeader from './Chat/ChatHeader';
import PostSelector from './Chat/Chat-Component/ObjectDiscussion_Selector';
import MessageList from './Chat/MessageList';
import MessageInput from './Chat/MessageInput';

// Inner component that uses the context
const ChatContent: React.FC = () => {
  const { 
    error, 
    isInitializing, 
    otherUser,
    currentUserId,
    conversationId,
    router,
    selectedPost, 
    editingContent, 
    setSelectedPost, 
    setEditingContent,
    handleDiscussionSubmit,
    dict
  } = useChat();

  // Set up real-time message reception
  const { sendTypingStatus } = useMessageReception({
    conversationId: conversationId!,
    currentUserId: currentUserId!,
  });

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="max-w-md w-full space-y-4 text-center px-4">
          <div className="text-xl text-red-500">{error}</div>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
          >
            {dict.chat.actions.back}
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing || !otherUser) {
    return <Loading text={dict.chat.loading.chat} />;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="absolute inset-0 flex flex-col">
        {/* Chat header component */}
        <ChatHeader />

        {/* Post selector component */}
        <div className="absolute top-16 left-0 right-0 z-20">
          <div className="container max-w-4xl mx-auto">
            <div className="flex flex-col mx-4">
              <PostSelector />
            </div>
          </div>
        </div>

        {/* Messages container */}
        <div className="absolute inset-0 pt-36 pb-6">
          <div className="container max-w-4xl mx-auto h-full">
            <div className="h-full mx-4 bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg flex flex-col">
              {/* Messages list component */}
              <MessageList />

              {/* Object Discussion */}
              {(selectedPost || editingContent) && (
                <ObjectDiscussion
                  post={selectedPost ? {
                    ...selectedPost,
                    location: selectedPost.location ? {
                      city: selectedPost.location.city || '',
                      country: selectedPost.location.country || ''
                    } : undefined
                  } : {
                    _id: editingContent!.postId,
                    images: editingContent!.images || [],
                    description: editingContent!.description,
                    price: editingContent!.originalPrice,
                    currency: editingContent!.currency,
                    historyId: editingContent!.historyId,
                    location: editingContent!.location ? {
                      city: editingContent!.location.split(',')[0].trim(),
                      country: editingContent!.location.split(',')[1].trim()
                    } : undefined
                  }}
                  initialValues={editingContent ? {
                    price: editingContent.suggestedPrice,
                    location: editingContent.location,
                    meetingTime: editingContent.meetingTime,
                  } : undefined}
                  onClose={() => {
                    setSelectedPost(null);
                    setEditingContent(null);
                  }}
                  onSubmit={handleDiscussionSubmit}
                />
              )}

              {/* Message input component */}
              <MessageInput />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Chat component that provides the context
export default function Chat({ userId }: ChatProps) {
  const { currentUser, loadingUser } = useCurrentUser();

  if (loadingUser) {
    return <Loading />;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <SocketProvider userId={currentUser._id}>
      <ChatProvider userId={userId}>
        <ChatContent />
      </ChatProvider>
    </SocketProvider>
  );
} 