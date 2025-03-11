import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ChatUser, ChatMessage } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { userApiService } from '@/lib/services/api/users/userService';
import { exploreApiService } from '@/lib/services/api/explore/exploreService';
import { messageApiService } from '@/lib/services/api/chat/messageApiService';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { MessagesResponse } from '@/lib/utils/cache/types';

interface UseChatDataProps {
  userId: string;
  conversationId?: string;
  otherUser?: ChatUser | null;
}

// Helper function to get primary image
export const getPrimaryImage = (images: Array<{id: string, url: string, isPrimary: boolean}>) => {
  const primaryImage = images.find(img => img.isPrimary);
  return primaryImage ? primaryImage.url : (images[0]?.url || '');
};

// Helper function to process messages
function processMessages(messagesData: any) {
  const messages = messagesData?.pages.flatMap((page: MessagesResponse) => page.messages) ?? [];
  
  // Create a Map to track unique messages by ID
  const uniqueMessages = new Map();
  
  // Process messages and keep only unique ones
  messages.forEach((msg: ChatMessage) => {
    // Process message content if needed
    const processedMsg = typeof msg.content !== 'string' && msg.content.type === 'object_discussion'
      ? {
          ...msg,
          content: {
            ...msg.content,
            imageUrl: getPrimaryImage(msg.content.images || []),
          }
        }
      : msg;
    
    // Only add if not already in the map (keep the first occurrence)
    if (!uniqueMessages.has(msg._id)) {
      uniqueMessages.set(msg._id, processedMsg);
    }
  });
  
  // Convert map values to array and sort by creation time
  return Array.from(uniqueMessages.values())
    .sort((a: ChatMessage, b: ChatMessage) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

// Helper function to format user posts
function formatUserPosts(posts: ExploreItem[]) {
  return posts.map(post => ({
    ...post,
    imageUrl: getPrimaryImage(post.images),
  }));
}

export function useChatData({ userId, conversationId, otherUser }: UseChatDataProps) {
  // Get current user data
  const {
    data: currentUser,
    isLoading: isLoadingCurrentUser,
    error: currentUserError
  } = useQuery({
    ...chatCacheService.getCurrentUserQuery(),
    queryFn: () => userApiService.getCurrentUser(),
    enabled: !!userId,
  });

  // Get other user data
  const {
    data: otherUserData,
    isLoading: isLoadingOtherUser,
    error: otherUserError
  } = useQuery({
    ...chatCacheService.getUserByIdQuery(userId),
    queryFn: () => userApiService.getUserById(userId),
    enabled: !!userId,
  });

  // Get messages data
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useInfiniteQuery({
    ...chatCacheService.getMessagesQuery(conversationId!),
    queryFn: ({ pageParam }) => messageApiService.getMessages(conversationId!, pageParam),
    enabled: !!conversationId,
  });

  // Get user posts
  const {
    data: userPosts = [],
    isLoading: isLoadingPosts,
    error: postsError
  } = useQuery({
    ...chatCacheService.getUserPostsQuery(otherUser?._id!),
    queryFn: () => exploreApiService.getUserPosts(otherUser!._id),
    enabled: !!otherUser?._id,
  });

  // Get typing status
  const { data: isTyping = false } = useQuery({
    ...chatCacheService.getTypingStatusQuery(otherUser?._id!),
  });

  // Process messages and posts
  const messages = processMessages(messagesData);
  const formattedUserPosts = formatUserPosts(userPosts);

  return {
    // User data
    currentUser,
    otherUserData,
    isLoadingUsers: isLoadingCurrentUser || isLoadingOtherUser,
    userError: currentUserError?.message || otherUserError?.message || null,
    
    // Messages data
    messages,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    isLoadingMessages,
    messagesError: messagesError?.message || null,
    fetchNextPage,
    
    // Posts data
    userPosts: formattedUserPosts,
    isLoadingPosts,
    postsError: postsError?.message || null,
    
    // Typing status
    isTyping,
  };
} 