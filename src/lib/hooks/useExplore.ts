import { useState, useCallback } from 'react';
import { ExploreItem } from '@/lib/types/explore'; // Define a Post type similar to HistoryItem

export function useExplore(initialData: ExploreItem[] = []) {
  const [explores, setExplore] = useState<ExploreItem[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts from the explore collection
  const fetchExplorePosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/explore');
      if (!response.ok) {
        throw new Error('Failed to fetch explore posts');
      }
      const data = await response.json();

      // Update state only if data has changed
      if (JSON.stringify(data) !== JSON.stringify(explores)) {
        setExplore(data);
      }

      setError(null);
    } catch (error) {
      console.error('Fetch explore posts failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch explore posts');
    } finally {
      setIsLoading(false);
    }
  }, [explores]);

  // Delete a post from the explore collection
  const deleteExplorePost = async (exploreId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/explore/${exploreId}`, {method: 'DELETE'});

      if (!response.ok) {
        throw new Error('Failed to delete explore post');
      }

      // Update the posts state by removing the deleted post
      setExplore(explores.filter((explore) => explore._id !== exploreId));
    } catch (error) {
      console.error('Delete explore post failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete explore post');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    explores,
    isLoading,
    error,
    fetchExplorePosts,
    deleteExplorePost,
  };
}