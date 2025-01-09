import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExploreItem } from '@/lib/types/explore';

// API functions
const fetchExplorePosts = async (): Promise<ExploreItem[]> => {
  try {
    const response = await fetch('/api/explore', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('Explore API error:', {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Failed to fetch explore posts: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate and transform the data
    const validatedData = data.map((item: ExploreItem) => ({
      ...item,
      imageUrl: item.imageUrl || '/image/placeholder.jpg',
      createdAt: item.createdAt || new Date().toISOString(),
      description: item.description || 'No description available',
      price: item.price || 0,
      userProfile: {
        ...item.userProfile,
        avatarUrl: item.userProfile?.avatarUrl || '/image/default-avatar.png',
        name: item.userProfile?.name || 'Anonymous',
      },
    }));

    return validatedData;
  } catch (error) {
    console.error('Error in fetchExplorePosts:', error);
    throw error;
  }
};

const deleteExplorePost = async (exploreId: string): Promise<void> => {
  const response = await fetch(`/api/explore/${exploreId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Failed to delete explore post');
  }
};

export function useExplore(initialData: ExploreItem[] = []) {
  const queryClient = useQueryClient();

  // Query for fetching posts
  const { data: explores = initialData, isLoading, error } = useQuery({
    queryKey: ['explores'],
    queryFn: fetchExplorePosts,
    initialData: initialData.map(item => ({
      ...item,
      imageUrl: item.imageUrl || '/image/placeholder.jpg',
      userProfile: {
        ...item.userProfile,
        avatarUrl: item.userProfile?.avatarUrl || '/image/default-avatar.png',
      },
    })),
    staleTime: 0, // Always consider data stale
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Mutation for deleting posts
  const { mutate: deletePost } = useMutation({
    mutationFn: deleteExplorePost,
    onSuccess: (_, exploreId) => {
      queryClient.setQueryData(['explores'], (old: ExploreItem[] | undefined) => 
        old?.filter((explore) => explore._id !== exploreId) ?? []
      );
    },
  });

  return {
    explores,
    isLoading,
    error: error instanceof Error ? error.message : null,
    deleteExplorePost: deletePost,
  };
}