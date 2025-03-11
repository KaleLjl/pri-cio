import React, { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import MessageItem from './MessageItem';
import { useChatData } from '@/hooks/chat/useGetData';

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
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { ref: loadMoreRef, inView } = useInView();
  
  // States
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Scroll to bottom function
  const scrollToBottom = () => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle scroll - transferred from useChatUI
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!e) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldScrollToBottom(isNearBottom);
  };
  
  // Handle new messages and scrolling
  useEffect(() => {
    if (!messages.length) return;

    const lastMessage = messages[messages.length - 1];
    const isNewMessage = lastMessage._id !== lastMessageRef.current;
    
    if (isNewMessage) {
      lastMessageRef.current = lastMessage._id;
      if (shouldScrollToBottom || lastMessage.senderId === userId) {
        scrollToBottom();
      }
    }
  }, [messages, userId, shouldScrollToBottom]);

  // Handle infinite scroll
  useEffect(() => {
    if (inView && hasNextPage && !loadingMore) {
      console.log('Loading more messages triggered by scroll');
      setLoadingMore(true);
      fetchNextPage()
        .then(result => {
          console.log('Fetch next page result:', result);
          if (result.data?.pages) {
            console.log(`Added ${result.data.pages[result.data.pages.length - 1].messages.length} new messages`);
          }
        })
        .catch(error => {
          console.error('Error fetching more messages:', error);
        })
        .finally(() => setLoadingMore(false));
    }
  }, [inView, hasNextPage, fetchNextPage, loadingMore]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, []);

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-6 bg-[#1e1e32] scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent"
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