'use client';
import React from 'react';
import { ChatProps } from '@/lib/types/chat';
import { useMessageReception } from '@/hooks/chat/useMessageReception';
import { ChatProvider, useChatContext } from '@/context/ChatContext';
import Loading from '@/components/shared/Loading';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

// Chat content component that uses the context
function ChatContent() {
  const { 
    currentUserId, 
    otherUser, 
    conversationId, 
    isInitializing, 
    error 
  } = useChatContext();

  // Set up message reception
  const messageReception = useMessageReception({
    conversationId: conversationId || '',
    currentUserId: currentUserId || '',
    enabled: !!conversationId && !!currentUserId
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

  // Show message if required data is not available
  if (!otherUser?._id || !conversationId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-yellow-500 mb-2">Chat Not Available</h2>
          <p className="text-white">Unable to load chat information. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Fixed background */}
      <div className="fixed inset-0 bg-gradient-to-b from-purple-900 via-purple-800 to-gray-900" />

      {/* Main chat container */}
      <div className="fixed inset-0 flex flex-col overflow-hidden">
        <div className="container max-w-4xl mx-auto flex flex-col h-full p-4 pt-16">
          {/* Chat content container */}
          <div className="flex flex-col flex-grow h-0 bg-[#16162a]/90 rounded-lg shadow-2xl border border-purple-500/10 overflow-hidden">
            <ChatHeader />
            <MessageList />
            <MessageInput />
          </div>
        </div>
      </div>
    </>
  );
}

// Main chat component with provider
export default function Chat({ userId }: ChatProps) {
  // Get URL params
  const urlConversationId = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('id') || ''
    : '';

  // Prevent body scrolling
  React.useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <ChatProvider userId={userId} conversationId={urlConversationId}>
      <ChatContent />
    </ChatProvider>
  );
} 