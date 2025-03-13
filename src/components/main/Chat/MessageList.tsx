import React, { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import MessageItem from './MessageItem';
import { useMessageReception } from '@/hooks/chat/useMessageReception';
import { useChatContext } from '@/context/ChatContext';
import { ChatMessage } from '@/lib/types/chat';

const MessageList: React.FC = () => {
  const { currentUserId, conversationId } = useChatContext();
  
  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { ref: loadMoreRef, inView } = useInView();
  
  // States for scroll behavior
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  
  // Get messages using useMessageReception
  const { 
    messages = [], 
    isFetchingNextPage = false,
    fetchNextPage = async () => {},
    hasNextPage = false,
    isLoadingMessages = false,
    messagesError = null
  } = useMessageReception({ 
    conversationId: conversationId || '',
    currentUserId: currentUserId || '',
    enabled: !!conversationId && !!currentUserId
  }) || {};
  
  // Scroll to bottom function
  const scrollToBottom = () => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldScrollToBottom(isNearBottom);
  };
  
  // Load more messages when scrolling up
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Handle new messages and scrolling
  useEffect(() => {
    if (!messages.length) return;
    
    const lastMessage = messages[messages.length - 1];
    const isNewMessage = lastMessage._id !== lastMessageRef.current;
    
    if (isNewMessage) {
      lastMessageRef.current = lastMessage._id;
      if (shouldScrollToBottom || lastMessage.senderId === currentUserId) {
        scrollToBottom();
      }
    }
  }, [messages, currentUserId, shouldScrollToBottom]);

  // If required data is not available, don't render the component
  if (!currentUserId || !conversationId) {
    return null;
  }

  // Show loading state
  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Show error state
  if (messagesError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500">Failed to load messages</div>
      </div>
    );
  }

  return (
    <div 
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {/* Load more trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="text-center py-2">
          {isFetchingNextPage ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500 mx-auto"></div>
          ) : (
            <div className="text-gray-400 text-sm">Scroll to load more</div>
          )}
        </div>
      )}

      {/* Messages */}
      {messages.map((message: ChatMessage) => (
        <MessageItem
          key={message._id}
          message={message}
          userId={currentUserId}
          conversationId={conversationId}
        />
      ))}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 