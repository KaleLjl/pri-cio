import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ChatUser, ChatMessage } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { getPrimaryImage } from '@/context/ChatContext';
import { userApiService } from '@/lib/services/api/users/userService';
import { exploreApiService } from '@/lib/services/api/explore/exploreService';
import { messageApiService } from '@/lib/services/api/chat/messageService';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { MessagesResponse } from '@/lib/utils/cache/types';
import { CacheKeys } from '@/lib/utils/cache/types';

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
      return userApiService.getCurrentUser();
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
      return userApiService.getUserById(userId);
    },
    enabled: !!userId,
  });

  // Fetch messages using cache service
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useInfiniteQuery({
    queryKey: [CacheKeys.CONVERSATION_MESSAGES, conversationId],
    queryFn: async ({ pageParam = undefined }) => {
      return messageApiService.getMessages(conversationId!, pageParam);
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: MessagesResponse) => {
      if (!lastPage.hasMore) return undefined;
      const firstMessage = lastPage.messages[0];
      return firstMessage?._id;
    },
    enabled: !!conversationId,
  });

  // Fetch user posts
  const {
    data: userPosts = [],
    isLoading: isLoadingPosts,
    error: postsError
  } = useQuery({
    queryKey: ['explore-posts', otherUser?._id],
    queryFn: async () => {
      if (!otherUser?._id) throw new Error('No other user ID');
      return exploreApiService.getUserPosts(otherUser._id);
    },
    enabled: !!otherUser?._id,
  });

  // Get typing status from cache
  const { data: isTyping = false } = useQuery({
    queryKey: ['chat-typing-status', otherUser?._id],
    initialData: false,
  });

  // Process messages with proper image handling
  const messages = messagesData?.pages.flatMap((page: MessagesResponse) => page.messages) ?? [];
  const uniqueMessages = messages
    .map((msg: ChatMessage) => {
      if (typeof msg.content !== 'string' && msg.content.type === 'object_discussion') {
        return {
          ...msg,
          content: {
            ...msg.content,
            imageUrl: getPrimaryImage(msg.content.images || []),
          }
        };
      }
      return msg;
    })
    .sort((a: ChatMessage, b: ChatMessage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Format user posts with proper image handling
  const formattedUserPosts = userPosts.map((post: ExploreItem) => ({
    ...post,
    imageUrl: getPrimaryImage(post.images),
  }));

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
    userPosts: formattedUserPosts,
    isLoadingPosts,
    postsError: postsError?.message || null,
    
    // Typing status
    isTyping,
  };
} 