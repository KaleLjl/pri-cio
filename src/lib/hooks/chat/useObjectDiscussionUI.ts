import { ObjectDiscussionData, ChatMessage } from '@/lib/types/chat';
import { useObjectDiscussion } from './useObjectDiscussion';
import { QueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

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
      invalidMeetingTime?: string;
      invalidLocation?: string;
      validationError?: string;
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
      invalidMeetingTime: 'Meeting time must be set and in the future',
      invalidLocation: 'Meeting location must be specified',
      validationError: 'Invalid meeting details. Please ensure meeting time and location are properly set.',
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
  const { 
    selectedPost, 
    setSelectedPost, 
    editingContent, 
    setEditingContent, 
    isDiscussionModified,
    validateDiscussionDetails,
    isValidMeetingTime,
    isValidLocation 
  } = objectDiscussion;

  // Track sending state
  const [isSending, setIsSending] = useState(false);

  // Handle discussion submission
  const handleDiscussionSubmit = async (data: {
    price: string;
    location: string;
    meetingTime: string;
  }) => {
    // Validate meeting details
    if (!isValidLocation(data.location)) {
      alert(dict?.objectDiscussion?.invalidLocation || 'Meeting location must be specified');
      return;
    }
    
    if (!isValidMeetingTime(data.meetingTime)) {
      alert(dict?.objectDiscussion?.invalidMeetingTime || 'Meeting time must be set and in the future');
      return;
    }

    try {
      setIsSending(true);
      
      // Handle editing existing discussion
      if (editingContent) {
        const updatedContent: ObjectDiscussionData = {
          ...editingContent,
          suggestedPrice: data.price,
          location: data.location,
          meetingTime: data.meetingTime,
          status: 'discussing'
        };
        
        await sendMessage(updatedContent);
        setEditingContent(null);
      } 
      // Handle new discussion
      else if (selectedPost) {
        const newContent: ObjectDiscussionData = {
          type: 'object_discussion',
          postId: selectedPost._id,
          images: selectedPost.images || [], // Use images array or empty array as fallback
          description: selectedPost.description,
          suggestedPrice: data.price,
          originalPrice: selectedPost.price,
          currency: selectedPost.currency,
          location: data.location,
          meetingTime: data.meetingTime,
          status: 'discussing',
          historyId: selectedPost.historyId,
          discussingId: editingContent?.discussingId || uuidv4(), // Use existing ID or create new one
        };
        
        await sendMessage(newContent);
        setSelectedPost(null);
      } else {
        console.error("Neither selectedPost nor editingContent is available");
        alert('Failed to send discussion: No post selected');
      }
    } catch (error) {
      console.error('Failed to send object discussion:', error);
      alert(error instanceof Error ? error.message : 'Failed to send object discussion');
    } finally {
      setIsSending(false);
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
    // Validate meeting details before completing the deal
    const validation = validateDiscussionDetails(currentContent);
    if (!validation.isValid) {
      alert(validation.errorMessage || dict?.objectDiscussion?.validationError);
      return;
    }

    try {
      setIsSending(true);
      await objectDiscussion.handleDealComplete(currentContent, senderId);
    } catch (error) {
      console.error('Error completing deal:', error);
      const DEFAULT_ERROR = 'Failed to complete deal. Please try again.';
      alert(error instanceof Error ? error.message : dict?.objectDiscussion?.dealError ?? DEFAULT_ERROR);
    } finally {
      setIsSending(false);
    }
  };

  // Handle discussion cancellation
  const handleCancelDiscussion = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
  ) => {
    try {
      setIsSending(true);
      await objectDiscussion.handleCancelDiscussion(currentContent);
    } catch (error) {
      console.error('Error canceling discussion:', error);
      const DEFAULT_ERROR = 'Failed to cancel deal. Please try again.';
      alert(dict?.objectDiscussion?.dealError ?? DEFAULT_ERROR);
    } finally {
      setIsSending(false);
    }
  };

  return {
    // States
    selectedPost,
    editingContent,
    isSending,
    
    // Actions
    setSelectedPost,
    handleDiscussionSubmit,
    handleObjectDiscussionClick,
    handleDealComplete,
    handleCancelDiscussion,
    
    // Validation functions
    isValidMeetingTime,
    isValidLocation,
    
    // Original object discussion methods
    isCurrentUserSeller: objectDiscussion.isCurrentUserSeller,
    isPostCompleted: objectDiscussion.isPostCompleted,
    isLastDiscussionMessage: objectDiscussion.isLastDiscussionMessage,
    setEditingContent: objectDiscussion.setEditingContent,
    isPostInDiscussion: objectDiscussion.isPostInDiscussion,
    isPostFinalized: objectDiscussion.isPostFinalized,
  };
} 