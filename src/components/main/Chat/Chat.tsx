'use client';
import React from 'react';
import { ChatProps } from '@/lib/types/chat';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { useSocketConnection } from '@/hooks/chat/useSocketConnection';
import { useMessageReception } from '@/hooks/chat/useMessageReception';
import { useInitializeChat } from '@/hooks/chat/useInitializeChat';
import Loading from '@/components/shared/Loading';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

// Main chat component
export default function Chat({ userId }: ChatProps) {
  // Get current user
  const { currentUser } = useCurrentUser();
  
  // Get URL params
  const urlConversationId = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('id') || ''
    : '';
  
  // Initialize socket connection
  useSocketConnection({ userId });
  
  // Initialize chat
  const { isInitializing, error, otherUser, conversationId, currentUserId } = useInitializeChat({ 
    userId, 
    conversationId: urlConversationId 
  });
  
  // Set up message reception
  useMessageReception({
    conversationId,
    currentUserId: currentUserId || userId, // Use currentUserId from useInitializeChat if available
    enabled: !!conversationId && !!(currentUserId || userId)
  });

  // Prevent body scrolling
  React.useEffect(() => {
    // Save original styles
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Disable scrolling on body
    document.body.style.overflow = 'hidden';
    
    // Cleanup function to restore original style
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  
  // Show loading state
  if (isInitializing) {
    return <Loading />;
  }
  
  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-white">{error}</p>
        </div>
      </div>
    );
  }
  
  // Show message if otherUser is not available
  if (!otherUser || !otherUser._id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-yellow-500 mb-2">Chat Not Available</h2>
          <p className="text-white">Unable to load chat information. Please try again later.</p>
        </div>
      </div>
    );
  }
  
  // Show message if conversationId is not available
  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-yellow-500 mb-2">Chat Not Available</h2>
          <p className="text-white">Unable to load conversation. Please try again later.</p>
        </div>
      </div>
    );
  }
  
  // Use currentUserId from useInitializeChat if available, fallback to userId
  const actualUserId = currentUserId || userId;
  
  return (
    <>
      {/* Fixed background */}
      <div className="fixed inset-0 bg-gradient-to-b from-purple-900 via-purple-800 to-gray-900" />
      
      {/* Main chat container */}
      <div className="fixed inset-0 flex flex-col overflow-hidden">
        <div className="container max-w-4xl mx-auto flex flex-col h-full p-4 pt-16">
          {/* Chat content container */}
          <div className="flex flex-col flex-grow h-0 bg-[#16162a]/90 rounded-lg shadow-2xl border border-purple-500/10 overflow-hidden">
            {/* Chat header - now part of the normal flow */}
            <ChatHeader userId={actualUserId} conversationId={conversationId} />
            
            {/* Message list - scrollable area */}
            <MessageList userId={actualUserId} conversationId={conversationId} />
            
            {/* Message input */}
            <MessageInput 
              userId={actualUserId} 
              conversationId={conversationId} 
              otherUserId={otherUser._id}
            />
          </div>
        </div>
      </div>
    </>
  );
} 