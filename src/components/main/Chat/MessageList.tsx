import React from 'react';
import MessageItem from './MessageItem';
import { useChatData } from '@/hooks/chat/useGetData';
import { useChatUI } from '@/hooks/chat/useChatUI';

interface MessageListProps {
  userId: string;
  conversationId: string;
}

const MessageList: React.FC<MessageListProps> = ({ userId, conversationId }) => {
  // Get chat data
  const { 
    messages, 
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useChatData({ 
    userId, 
    conversationId 
  });
  
  // Get UI state
  const { 
    messagesContainerRef,
    loadMoreRef,
    messagesEndRef,
    handleScroll
  } = useChatUI({
    messages,
    currentUserId: userId,
    conversationId,
    fetchNextPage,
    hasNextPage
  });

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
          <MessageItem 
            key={message._id} 
            message={message} 
            userId={userId}
            conversationId={conversationId}
          />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 