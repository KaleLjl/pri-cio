export const exploreApiService = {
  // Get user posts
  getUserPosts: async (userId: string) => {
    const response = await fetch(`/api/explore?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user posts');
    }
    return response.json();
  }
}; 