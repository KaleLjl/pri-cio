import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ChatMessage, ChatUser, MessagesResponse } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';

interface UseChatDataProps {
  userId: string;
  conversationId?: string;
  otherUser?: ChatUser | null;
}

export function useChatData({ userId, conversationId, otherUser }: UseChatDataProps) {
  // Fetch current user data
  const {
    data: currentUser,
    isLoading: isLoadingCurrentUser,
    error: currentUserError
  } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Failed to fetch current user');
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch other user data
  const {
    data: otherUserData,
    isLoading: isLoadingOtherUser,
    error: otherUserError
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch messages
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useInfiniteQuery<MessagesResponse>({
    queryKey: ['chat-messages', conversationId],
    queryFn: async ({ pageParam = undefined }) => {
      if (!conversationId) throw new Error('No conversation ID');
      
      const url = new URL('/api/chat/messages', window.location.origin);
      url.searchParams.append('conversationId', conversationId);
      if (pageParam) {
        url.searchParams.append('before', pageParam as string);
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch messages');

      return response.json();
    },
    getNextPageParam: (lastPage: MessagesResponse) => {
      if (!lastPage.hasMore) return undefined;
      const firstMessage = lastPage.messages[0];
      return firstMessage?._id;
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    initialPageParam: undefined,
  });

  // Fetch user posts
  const {
    data: userPosts = [],
    isLoading: isLoadingPosts,
    error: postsError
  } = useQuery({
    queryKey: ['explore-posts', userId],
    queryFn: async () => {
      const response = await fetch('/api/explore');
      if (!response.ok) throw new Error('Failed to fetch user posts');
      const allPosts = await response.json();
      return allPosts.filter((post: ExploreItem) => post.userProfile?._id === userId);
    },
    enabled: !!userId && !!otherUser,
  });

  // Get typing status from cache
  const { data: isTyping = false } = useQuery({
    queryKey: ['chat-typing-status', userId],
    initialData: false,
  });

  // Flatten messages from all pages
  const messages = messagesData?.pages.flatMap(page => page.messages) ?? [];
  const uniqueMessages = Array.from(
    new Map(messages.map(msg => [msg._id, msg])).values()
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return {
    // User data
    currentUser,
    otherUserData,
    isLoadingUsers: isLoadingCurrentUser || isLoadingOtherUser,
    userError: currentUserError?.message || otherUserError?.message || null,
    
    // Messages data
    messages: uniqueMessages,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    isLoadingMessages,
    messagesError: messagesError?.message || null,
    fetchNextPage: async () => { await fetchNextPage(); },
    
    // Posts data
    userPosts,
    isLoadingPosts,
    postsError: postsError?.message || null,
    
    // Typing status
    isTyping,
  };
} 