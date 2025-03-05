import { useState, useRef, useEffect, useContext } from 'react';
import { useInView } from 'react-intersection-observer';
import { ChatMessage } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { SocketContext } from '@/lib/context/SocketContext';

interface UseChatUIProps {
  messages: ChatMessage[];
  currentUserId?: string;
  conversationId?: string;
  fetchNextPage: () => Promise<void>;
  hasNextPage?: boolean;
}

export function useChatUI({
  messages,
  currentUserId,
  conversationId,
  fetchNextPage,
  hasNextPage,
}: UseChatUIProps) {
  const socket = useContext(SocketContext);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // States
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [myPosts, setMyPosts] = useState<ExploreItem[]>([]);
  const [isLoadingMyPosts, setIsLoadingMyPosts] = useState(false);
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

      // Mark messages as read
      if (conversationId && currentUserId && lastMessage.senderId !== currentUserId) {
        fetch('/api/chat/messages', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ conversationId }),
        }).catch(console.error);
      }
    }
  }, [messages, currentUserId, shouldScrollToBottom, conversationId]);

  // Load more messages when scrolling up
  useEffect(() => {
    if (inView && !loadingMore && hasNextPage) {
      setLoadingMore(true);
      fetchNextPage().finally(() => setLoadingMore(false));
    }
  }, [inView, hasNextPage, fetchNextPage]);

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

  // Fetch current user's posts
  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!currentUserId) return;
      setIsLoadingMyPosts(true);
      try {
        const response = await fetch('/api/explore');
        if (!response.ok) throw new Error('Failed to fetch posts');
        const allPosts = await response.json();
        setMyPosts(allPosts.filter((post: ExploreItem) => post.userProfile?._id === currentUserId));
      } catch (error) {
        console.error('Error fetching my posts:', error);
      } finally {
        setIsLoadingMyPosts(false);
      }
    };

    fetchMyPosts();
  }, [currentUserId]);

  // Handle typing
  const handleTyping = (typing: boolean) => {
    if (!conversationId || !currentUserId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.sendTyping({
      conversationId,
      userId: currentUserId,
      typing,
    });

    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.sendTyping({
          conversationId,
          userId: currentUserId,
          typing: false,
        });
      }, 3000);
    }
  };

  // Handle message input
  const handleMessageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    handleTyping(true);
  };

  // Handle message submit
  const handleMessageSubmit = (message: string) => {
    if (!message) return;
    handleTyping(false);
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
    myPosts,
    isLoadingMyPosts,
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