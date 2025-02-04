import { useQuery, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { ChatMessage, ChatUser, MessagesResponse, MessageContent } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { useSocketChat } from './useSocketChat';
import { v4 as uuidv4 } from 'uuid';

interface UseChatDataProps {
  userId: string;
  conversationId?: string;
  otherUser?: ChatUser | null;
}

export function useChatData({ userId, conversationId, otherUser }: UseChatDataProps) {
  const { sendMessage: sendSocketMessage } = useSocketChat({
    conversationId,
    currentUserId: userId,
    otherUserId: otherUser?._id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: MessageContent) => {
      if (!conversationId || !otherUser?._id) {
        throw new Error('Missing required data');
      }

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content,
          receiverId: otherUser._id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      sendSocketMessage(data);
      return data;
    },
  });

  // Delete messages mutation
  const deleteMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) {
        throw new Error('No conversation ID');
      }

      const response = await fetch('/api/chat/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete messages');
      }
    },
  });

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
    queryKey: ['explore-posts', otherUser?._id],
    queryFn: async () => {
      if (!otherUser?._id) throw new Error('No other user ID');
      // 直接获取对方用户的帖子
      const response = await fetch(`/api/explore?userId=${otherUser._id}`);
      if (!response.ok) throw new Error('Failed to fetch user posts');
      return response.json();
    },
    enabled: !!otherUser?._id,
  });

  // Get typing status from cache
  const { data: isTyping = false } = useQuery({
    queryKey: ['chat-typing-status', userId],
    initialData: false,
  });

  // Flatten messages from all pages
  const messages = messagesData?.pages.flatMap(page => page.messages) ?? [];
  const uniqueMessages = Array.from(
    new Map(messages.map(msg => {
      // 如果是 ObjectDiscussion，使用 postId 和时间戳作为唯一键
      if (typeof msg.content !== 'string' && msg.content.type === 'object_discussion') {
        return [`${msg.content.postId}-${msg.createdAt}`, msg];
      }
      // 其他消息类型使用 _id
      return [msg._id, msg];
    })).values()
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
    
    // Message actions
    sendMessage: sendMessageMutation.mutateAsync,
    deleteMessages: deleteMessagesMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    
    // Typing status
    isTyping,
  };
} 