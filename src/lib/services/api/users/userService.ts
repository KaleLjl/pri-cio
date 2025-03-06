export const userApiService = {
  // Get current user
  getCurrentUser: async () => {
    const response = await fetch('/api/users/me');
    if (!response.ok) {
      throw new Error('Failed to fetch current user');
    }
    return response.json();
  },
  
  // Get user by ID
  getUserById: async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  }
}; 