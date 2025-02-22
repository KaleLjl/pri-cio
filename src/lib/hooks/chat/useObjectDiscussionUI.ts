import { ObjectDiscussionData, ChatMessage } from '@/lib/types/chat';
import { useObjectDiscussion } from './useObjectDiscussion';
import { QueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface UseObjectDiscussionUIProps {
  currentUserId: string;
  messages: ChatMessage[];
  sendMessage: (content: string | ObjectDiscussionData) => Promise<void>;
  queryClient: QueryClient;
  setShowPosts: (show: boolean) => void;
  dict?: {
    objectDiscussion?: {
      dealError?: string;
      noChangesMessage?: string;
      alreadyInDiscussion?: string;
      inDiscussion?: string;
    };
  };
}

export function useObjectDiscussionUI({
  currentUserId,
  messages,
  sendMessage,
  queryClient,
  setShowPosts,
  dict = { 
    objectDiscussion: { 
      dealError: 'Failed to complete deal. Please try again.',
      alreadyInDiscussion: 'This item is already in discussion.',
      inDiscussion: 'In Discussion',
    } 
  },
}: UseObjectDiscussionUIProps) {
  // Use the base object discussion hook
  const objectDiscussion = useObjectDiscussion({
    currentUserId,
    sendMessage,
    messages,
  });

  // Get states from the base hook
  const { selectedPost, setSelectedPost, editingContent, setEditingContent, isDiscussionModified } = objectDiscussion;

  // Track sending state
  const [isSending, setIsSending] = useState(false);

  // Handle discussion submission
  const handleDiscussionSubmit = async (data: {
    price: string;
    location: string;
    meetingTime: string;
  }) => {
    if (!selectedPost) return;

    const content: ObjectDiscussionData = {
      type: 'object_discussion',
      postId: selectedPost._id,
      images: selectedPost.images, // 使用完整的图片数组
      description: selectedPost.description,
      suggestedPrice: data.price,
      originalPrice: selectedPost.price,
      currency: selectedPost.currency,
      location: data.location,
      meetingTime: data.meetingTime,
      status: 'discussing',
      historyId: selectedPost.historyId,
    };

    try {
      await sendMessage(content);
      setSelectedPost(null);
    } catch (error) {
      console.error('Failed to send object discussion:', error);
    }
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
      await objectDiscussion.handleDealComplete(currentContent, senderId);
    } catch (error) {
      console.error('Error completing deal:', error);
      const DEFAULT_ERROR = 'Failed to complete deal. Please try again.';
      alert(dict?.objectDiscussion?.dealError ?? DEFAULT_ERROR);
    }
  };

  // Handle discussion cancellation
  const handleCancelDiscussion = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
  ) => {
    try {
      await objectDiscussion.handleCancelDiscussion(currentContent);
    } catch (error) {
      console.error('Error canceling discussion:', error);
      const DEFAULT_ERROR = 'Failed to cancel deal. Please try again.';
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
    handleCancelDiscussion,
    
    // Original object discussion methods
    isCurrentUserSeller: objectDiscussion.isCurrentUserSeller,
    isPostCompleted: objectDiscussion.isPostCompleted,
    isLastDiscussionMessage: objectDiscussion.isLastDiscussionMessage,
    setEditingContent: objectDiscussion.setEditingContent,
    isPostInDiscussion: objectDiscussion.isPostInDiscussion,
    isPostFinalized: objectDiscussion.isPostFinalized,
  };
} 