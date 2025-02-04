import { ObjectDiscussionData, ChatMessage } from '@/lib/types/chat';
import { useObjectDiscussion } from './useObjectDiscussion';
import { QueryClient } from '@tanstack/react-query';

interface UseObjectDiscussionUIProps {
  currentUserId: string;
  messages: ChatMessage[];
  sendMessage: (content: string | ObjectDiscussionData) => Promise<void>;
  queryClient: QueryClient;
  setShowPosts: (show: boolean) => void;
  dict?: {
    objectDiscussion?: {
      dealError?: string;
    };
  };
}

export function useObjectDiscussionUI({
  currentUserId,
  messages,
  sendMessage,
  queryClient,
  setShowPosts,
  dict = { objectDiscussion: { dealError: 'Failed to complete deal. Please try again.' } },
}: UseObjectDiscussionUIProps) {
  // Use the base object discussion hook
  const objectDiscussion = useObjectDiscussion({
    currentUserId,
    sendMessage,
    queryClient,
    messages,
  });

  // Get states from the base hook
  const { selectedPost, setSelectedPost, editingContent } = objectDiscussion;

  // Handle discussion submission
  const handleDiscussionSubmit = (data: {
    price: string;
    location: string;
    meetingTime: string;
  }) => {
    objectDiscussion.handleDiscussionSubmit(data);
    setShowPosts(false);
  };

  // Handle object discussion click
  const handleObjectDiscussionClick = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
  ) => {
    try {
      await objectDiscussion.handleObjectDiscussionClick(currentContent, senderId, messages);
    } catch (error) {
      console.error('Error handling object discussion click:', error);
    }
  };

  // Handle deal completion
  const handleDealComplete = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
  ) => {
    try {
      await objectDiscussion.handleDealComplete(currentContent, senderId, messages);
    } catch (error) {
      console.error('Error completing deal:', error);
      const DEFAULT_ERROR = 'Failed to complete deal. Please try again.';
      alert(dict?.objectDiscussion?.dealError ?? DEFAULT_ERROR);
    }
  };

  return {
    // States
    selectedPost,
    editingContent,
    
    // Actions
    setSelectedPost,
    handleDiscussionSubmit,
    handleObjectDiscussionClick,
    handleDealComplete,
    
    // Original object discussion methods
    isCurrentUserSeller: objectDiscussion.isCurrentUserSeller,
    isPostCompleted: objectDiscussion.isPostCompleted,
    isLastDiscussionMessage: objectDiscussion.isLastDiscussionMessage,
    setEditingContent: objectDiscussion.setEditingContent,
  };
} 