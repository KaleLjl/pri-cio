import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatCacheService } from '@/lib/services/cache/chatCacheService';
import { exploreApiService } from '@/lib/services/api/explore/exploreService';
import { ExploreItem } from '@/lib/types/explore';

interface UseChatDataProps {
  userId: string;
  conversationId: string;
  enabled?: boolean;
  queryType?: 'posts-only' | 'all';
}

export function useChatData({ 
  userId, 
  conversationId,
  enabled = true,
  queryType = 'all'
}: UseChatDataProps) {
  // Initialize cache service
  const queryClient = useQueryClient();
  chatCacheService.initialize(queryClient);

  // Get user posts data
  const {
    data: userPosts = [],
    isLoading: isLoadingPosts,
  } = useQuery<ExploreItem[]>({
    ...chatCacheService.getUserPostsQuery(userId),
    queryFn: () => exploreApiService.getUserPosts(userId),
    enabled: enabled && !!userId && queryType === 'posts-only',
  });

  return {
    userPosts,
    isLoadingPosts,
  };
} 