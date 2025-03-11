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
  const conversationId = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('id') || ''
    : '';
  
  // Initialize socket connection
  useSocketConnection({ userId });
  
  // Initialize chat
  const { isInitializing, error } = useInitializeChat({ 
    userId, 
    conversationId 
  });
  
  // Set up message reception
  useMessageReception({
    conversationId,
    currentUserId: userId,
    enabled: !!conversationId && !!userId
  });
  
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
  
  return (
    <div className="flex flex-col h-screen pt-16 bg-gray-900">
      <div className="container max-w-4xl mx-auto flex-1 flex flex-col">
        {/* Chat header */}
        <ChatHeader userId={userId} conversationId={conversationId} />
        
        {/* Chat content */}
        <div className="flex-1 flex flex-col overflow-hidden relative mt-20">
          {/* Message list */}
          <MessageList userId={userId} conversationId={conversationId} />
          
          {/* Message input */}
          <MessageInput userId={userId} conversationId={conversationId} />
        </div>
      </div>
    </div>
  );
} 