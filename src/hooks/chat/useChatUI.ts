import { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { ChatMessage } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { socketService } from '@/lib/services/socket/socketService';

interface UseChatUIProps {
  messages: ChatMessage[];
  currentUserId?: string;
  conversationId?: string;
  fetchNextPage: () => Promise<void>;
  hasNextPage?: boolean;
  userPosts?: ExploreItem[];
  onTyping?: (typing: boolean) => void;
}

export function useChatUI({
  messages,
  currentUserId,
  conversationId,
  fetchNextPage,
  hasNextPage,
  userPosts = [],
  onTyping,
}: UseChatUIProps) {
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // States
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showPosts, setShowPosts] = useState(true);
  const [inputMessage, setInputMessage] = useState("");

  // InView hook for infinite scroll
  const { ref: loadMoreRef, inView } = useInView();

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle scroll
  const handleScroll = (e?: React.UIEvent<HTMLDivElement>) => {
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
      if (shouldScrollToBottom || lastMessage.senderId === currentUserId) {
        scrollToBottom();
      }
    }
  }, [messages, currentUserId, shouldScrollToBottom]);

  // Handle infinite scroll
  useEffect(() => {
    if (inView && hasNextPage && !loadingMore) {
      setLoadingMore(true);
      fetchNextPage().finally(() => setLoadingMore(false));
    }
  }, [inView, hasNextPage, fetchNextPage, loadingMore]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Save scroll position before toggling posts
  const handleTogglePosts = () => {
    if (messagesContainerRef.current) {
      setScrollPosition(messagesContainerRef.current.scrollTop);
    }
    setShowPosts(prev => !prev);
  };

  // Restore scroll position after toggling posts
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = scrollPosition;
    }
  }, [showPosts, scrollPosition]);

  // Handle post click
  const handlePostClick = (post: ExploreItem) => {
    setShowPosts(false);
    return post;
  };


  // Handle message input
  const handleMessageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    onTyping?.(true);
  };

  // Handle message submit
  const handleMessageSubmit = (message: string) => {
    if (!message) return;
    onTyping?.(false);
    setInputMessage("");
  };

  return {
    // Refs
    messagesEndRef,
    messagesContainerRef,
    loadMoreRef,

    // States
    inputMessage,
    showPosts,
    showMyPosts,
    userPosts,
    loadingMore,
    scrollPosition,

    // Actions
    setInputMessage,
    setShowMyPosts,
    setShowPosts,
    handleScroll,
    handleTogglePosts,
    handlePostClick,
    handleMessageInput,
    handleMessageSubmit,
    scrollToBottom,
  };
} 