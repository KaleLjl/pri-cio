import React from 'react';
import { useChat } from '@/lib/context/ChatContext';
import MessageItem from './MessageItem';

const MessageList: React.FC = () => {
  const { 
    messages, 
    isFetchingNextPage
  } = useChat();
  
  // Create local refs to avoid context type issues
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Get the handleScroll function from context but handle potential type issues
  const chatContext = useChat();
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (chatContext.handleScroll) {
      chatContext.handleScroll(e);
    }
  };

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800"
      onScroll={handleScroll}
    >
      {/* Load More Messages Indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
        </div>
      )}
      <div ref={loadMoreRef} />
      
      {/* Messages List */}
      <div className="space-y-6">
        {messages.map((message) => (
          <MessageItem key={message._id} message={message} />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 