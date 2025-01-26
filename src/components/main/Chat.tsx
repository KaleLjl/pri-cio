'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { ChatUser, ObjectDiscussionData } from '@/lib/types/chat';
import { useSession } from 'next-auth/react';
import { useInView } from 'react-intersection-observer';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/context/LanguageContext';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import Loading from '@/components/shared/Loading';
import { ExploreItem } from '@/lib/types/explore';
import { CURRENCIES } from '@/components/main/App';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socketService } from '@/lib/socket';
import ObjectDiscussion from '@/components/shared/ObjectDiscussion';

interface ChatProps {
  userId: string;
}

// API function to fetch user's explore posts
const fetchUserExplorePosts = async (userId: string): Promise<ExploreItem[]> => {
  const response = await fetch('/api/explore');
  if (!response.ok) {
    throw new Error('Failed to fetch user posts');
  }
  const allPosts = await response.json();
  return allPosts.filter((post: ExploreItem) => post.userProfile?._id === userId);
};

export default function Chat({ userId }: ChatProps) {
  const { dict } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { ref: loadMoreRef, inView } = useInView();
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const lastMessageRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [showPosts, setShowPosts] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [selectedPost, setSelectedPost] = useState<ExploreItem | null>(null);

  // Use React Query to fetch and manage explore posts
  const { data: userPosts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ['explore-posts', userId],
    queryFn: () => fetchUserExplorePosts(userId),
    enabled: !!userId && !!otherUser,
  });

  // Use React Query to manage typing status
  const { data: isTyping = false } = useQuery({
    queryKey: ['chat-typing-status', userId],
    initialData: false,
  });

  // Listen to socket updates for explore posts
  useEffect(() => {
    if (!userId) return;

    const handleExploreUpdate = (data: { userId: string }) => {
      if (data.userId === userId) {
        // Invalidate and refetch the explore posts query when we receive an update
        queryClient.invalidateQueries({ queryKey: ['explore-posts', userId] });
      }
    };

    socketService.onExplorePostsUpdate(handleExploreUpdate);

    return () => {
      socketService.removeEventListener('explore-posts-update', handleExploreUpdate);
    };
  }, [userId, queryClient]);

  // 身份验证检查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  // 立即检查是否是自己的ID
  useEffect(() => {
    const checkSelfChat = async () => {
      if (status === 'authenticated' && session?.user?.email) {
        try {
          const response = await fetch('/api/users/me');
          if (response.ok) {
            const userData = await response.json();
            if (userData._id === userId) {
              router.push('/chat');
              return;
            }
          }
        } catch (error) {
          console.error('Error checking self chat:', error);
        }
      }
    };
    checkSelfChat();
  }, [userId, status, session?.user?.email, router]);

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (status !== 'authenticated') return;
      
      try {
        // Make API calls in parallel
        const [currentUserResponse, userResponse] = await Promise.all([
          fetch('/api/users/me'),
          fetch(`/api/users/${userId}`)
        ]);

        if (!currentUserResponse.ok) {
          throw new Error(dict.chat.error.fetch);
        }
        if (!userResponse.ok) {
          throw new Error(dict.chat.error.fetch);
        }

        const [currentUserData, userData] = await Promise.all([
          currentUserResponse.json(),
          userResponse.json()
        ]);

        setCurrentUserId(currentUserData._id);
        setOtherUser({
          _id: userId,
          name: userData.name,
          avatarUrl: userData.avatarUrl,
        });

        // Create or get conversation
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            participantId: userId,
            limit: 20,
            offset: 0
          }),
        });

        if (!response.ok) {
          throw new Error(dict.chat.error.fetch);
        }

        const data = await response.json();
        setConversationId(data._id);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setError(error instanceof Error ? error.message : dict.chat.error.fetch);
      } finally {
        setIsInitializing(false);
      }
    };

    if (userId) {
      initializeChat();
    }
  }, [userId, status, dict.chat.error.fetch]);

  // Initialize chat hook only when we have all required data
  const chat = useChat(
    currentUserId && otherUser && conversationId
      ? {
          conversationId,
          currentUserId,
          otherUser,
        }
      : null
  );

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Check if we're at the bottom of the chat
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldScrollToBottom(isNearBottom);
  };

  useEffect(() => {
    if (!chat.messages.length) return;

    const lastMessage = chat.messages[chat.messages.length - 1];
    const isNewMessage = lastMessage._id !== lastMessageRef.current;
    
    if (isNewMessage) {
      lastMessageRef.current = lastMessage._id;
      // Only scroll if it's a new message and we're near the bottom
      // or if it's our own message
      if (shouldScrollToBottom || lastMessage.senderId === currentUserId) {
        scrollToBottom();
      }

      // 只有当消息是接收到的新消息时才标记为已读
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
  }, [chat.messages, currentUserId, shouldScrollToBottom, conversationId]);

  // Load more messages when scrolling up
  useEffect(() => {
    if (inView && !loadingMore && chat.hasMore) {
      setLoadingMore(true);
      chat.loadMoreMessages().finally(() => setLoadingMore(false));
    }
  }, [inView, chat.hasMore]);

  // Handle typing status
  const handleTyping = (typing: boolean) => {
    if (!conversationId || !currentUserId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing status
    socketService.sendTyping({
      conversationId,
      userId: currentUserId,
      typing,
    });

    // If typing, set a timeout to automatically set typing to false
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTyping({
          conversationId,
          userId: currentUserId,
          typing: false,
        });
      }, 3000); // Stop typing indicator after 3 seconds of inactivity
    }
  };

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

  const handlePostClick = (post: ExploreItem) => {
    setSelectedPost(post);
  };

  const handleDiscussionSubmit = (data: ObjectDiscussionData) => {
    chat.sendMessage(data);
    setSelectedPost(null);
  };

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chat.inputMessage.trim()) {
      // Clear typing status when sending message
      handleTyping(false);
      chat.sendMessage(chat.inputMessage.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="absolute inset-0 flex flex-col">
        {/* Chat Header - Fixed at top below navigation */}
        <div className="absolute top-16 left-0 right-0 z-20">
          <div className="container max-w-4xl mx-auto">
            <div className="flex flex-col mx-4">
              {/* User Info */}
              <div className="flex items-center space-x-4 p-4 bg-gray-800/95 backdrop-blur-sm rounded-t-lg shadow-lg">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                  aria-label={dict.chat.actions.back}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-500/50">
                  <ImageWithFallback
                    src={otherUser.avatarUrl || ''}
                    alt={otherUser.name || 'User'}
                    width={48}
                    height={48}
                    className="object-cover rounded-full"
                    isAvatar={true}
                    priority
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold">{otherUser.name || 'User'}</h1>
                  {isTyping && (
                    <p className="text-sm text-purple-400">{dict.chat.typing}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {!isLoadingPosts && userPosts.length > 0 && (
                    <button
                      onClick={handleTogglePosts}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-sm text-white"
                      title={showPosts ? "Hide posts" : "Show posts"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 transition-transform duration-200 ${showPosts ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (window.confirm(dict.chatHistory.deleteConfirm.message)) {
                        try {
                          await chat.deleteMessages();
                        } catch (error) {
                          console.error("Failed to delete messages:", error);
                          alert(dict.chatHistory.toast.deleteError);
                        }
                      }
                    }}
                    className="p-2 hover:bg-red-600 rounded-lg transition-colors text-sm text-white"
                    title={dict.chatHistory.deleteConfirm.title}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* User's Posts */}
              {!isLoadingPosts && userPosts.length > 0 && showPosts && (
                <div className="bg-gray-800/95 backdrop-blur-sm p-4 rounded-b-lg shadow-lg border-t border-gray-700/50">
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800">
                    <div className="flex space-x-4 pb-2">
                      {userPosts.map((post) => (
                        <div
                          key={post._id}
                          className="flex-none w-32 bg-gray-700/50 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                          onClick={() => handlePostClick(post)}
                        >
                          <div className="relative w-32 h-32">
                            <ImageWithFallback
                              src={post.imageUrl}
                              alt={post.description}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="p-2">
                            <p className="text-sm font-medium truncate">
                              {CURRENCIES.find(c => c.value === post.currency)?.symbol} {post.price}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {post.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Container - Scrollable area */}
        <div className="absolute inset-0 pt-36 pb-6">
          <div className="container max-w-4xl mx-auto h-full">
            <div className="h-full mx-4 bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg flex flex-col">
              {/* Messages Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800"
                onScroll={handleScroll}
              >
                {/* Load More Messages Indicator */}
                {chat.loadingMore && (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                  </div>
                )}
                <div ref={loadMoreRef} />
                
                {/* Messages List */}
                <div className="space-y-6">
                  {chat.messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${
                        message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl p-4 ${
                          message.senderId === currentUserId
                            ? 'bg-purple-600/90 backdrop-blur-sm shadow-lg hover:bg-purple-500/90 transition-colors'
                            : 'bg-gray-700/90 backdrop-blur-sm shadow-lg hover:bg-gray-600/90 transition-colors'
                        }`}
                      >
                        {typeof message.content === 'string' ? (
                          <p className="text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                            {message.content}
                          </p>
                        ) : message.content.type === 'object_discussion' ? (
                          <div className="space-y-3 max-w-sm">
                            <div className="flex items-start space-x-3">
                              <div className="relative w-20 h-20 flex-shrink-0">
                                <ImageWithFallback
                                  src={message.content.imageUrl}
                                  alt={message.content.description}
                                  fill
                                  className="object-cover rounded-lg"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                                  {message.content.description}
                                </p>
                                <div className="space-y-1.5 text-sm">
                                  <p className="flex items-center text-gray-300">
                                    <span className="text-gray-400 w-20">{dict.objectDiscussion?.price}:</span>
                                    <span className="ml-1 truncate">
                                      {CURRENCIES.find(c => c.value === message.content.currency)?.symbol}
                                      {message.content.suggestedPrice}
                                    </span>
                                    {message.content.suggestedPrice !== message.content.originalPrice && (
                                      <span className="ml-2 text-xs text-gray-400 truncate">
                                        (Original: {CURRENCIES.find(c => c.value === message.content.currency)?.symbol}
                                        {message.content.originalPrice})
                                      </span>
                                    )}
                                  </p>
                                  <p className="flex items-center text-gray-300">
                                    <span className="text-gray-400 w-20">{dict.objectDiscussion?.location}:</span>
                                    <span className="ml-1 truncate">{message.content.location}</span>
                                  </p>
                                  <p className="flex items-center text-gray-300">
                                    <span className="text-gray-400 w-20">{dict.objectDiscussion?.meetingTime}:</span>
                                    <span className="ml-1 truncate">
                                      {new Date(message.content.meetingTime).toLocaleString()}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <span className="text-xs text-gray-300">
                            {format(new Date(message.createdAt), 'HH:mm')}
                          </span>
                          {message.senderId === currentUserId && (
                            <span className="text-xs text-gray-300">
                              {message.status === 'sending' && dict.chat.status.sending}
                              {message.status === 'sent' && dict.chat.status.sent}
                              {message.status === 'delivered' && dict.chat.status.delivered}
                              {message.status === 'read' && dict.chat.status.read}
                              {message.status === 'error' && dict.chat.status.error}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {/* Object Discussion */}
              {selectedPost && (
                <ObjectDiscussion
                  post={selectedPost}
                  onClose={() => setSelectedPost(null)}
                  onSubmit={handleDiscussionSubmit}
                />
              )}

              {/* Message Input - Part of the same container */}
              <div className="p-4 border-t border-gray-700/50">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chat.inputMessage}
                    onChange={(e) => {
                      chat.setInputMessage(e.target.value);
                      handleTyping(true);
                    }}
                    placeholder={dict.chat.input.placeholder}
                    className="flex-1 bg-gray-700/50 backdrop-blur-sm text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!chat.inputMessage.trim() || chat.isSending}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
                  >
                    {chat.isSending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      dict.chat.actions.send
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 