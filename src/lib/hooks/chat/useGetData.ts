import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { ChatUser, MessagesResponse } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { getPrimaryImage } from '@/lib/context/ChatContext';
import { userApiService } from '@/lib/services/api/users/userService';
import { exploreApiService } from '@/lib/services/api/explore/exploreService';
import { messageApiService } from '@/lib/services/api/chat/messageService';

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
      return messageApiService.getMessages(conversationId, pageParam as string | undefined);
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: MessagesResponse) => {
      if (!lastPage.hasMore) return undefined;
      const firstMessage = lastPage.messages[0];
      return firstMessage?._id;
    },
    enabled: !!conversationId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    gcTime: Infinity,
    refetchOnReconnect: true,
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

  // 修改 uniqueMessages 的处理逻辑
  const messages = messagesData?.pages.flatMap(page => page.messages) ?? [];
  const uniqueMessages = Array.from(
    new Map(messages.map(msg => {
      if (typeof msg.content !== 'string' && msg.content.type === 'object_discussion') {
        // 确保消息内容包含完整的图片数组
        const updatedContent = {
          ...msg.content,
          images: msg.content.images || [], // 保持原有的图片数组
          imageUrl: getPrimaryImage(msg.content.images || []), // 为了向后兼容
        };
        return [`${msg.content.postId}-${msg.createdAt}`, {
          ...msg,
          content: updatedContent,
        }];
      }
      return [msg._id, msg];
    })).values()
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // 确保 userPosts 数据也使用正确的图片格式
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