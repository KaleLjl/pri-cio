import { ExploreItem } from '@/lib/types/explore';

export const postApiService = {
  // Get posts for a user
  getUserPosts: async (userId: string): Promise<ExploreItem[]> => {
    const response = await fetch(`/api/explore?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user posts');
    }
    return response.json();
  },

  // Get my posts
  getMyPosts: async (): Promise<ExploreItem[]> => {
    const response = await fetch('/api/explore/my-posts');
    if (!response.ok) {
      throw new Error('Failed to fetch my posts');
    }
    return response.json();
  }
}; 