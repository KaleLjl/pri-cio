import { ObjectDiscussionData, ChatMessage } from '@/lib/types/chat';
import { useObjectDiscussion } from './useObjectDiscussion';
import { QueryClient } from '@tanstack/react-query';
import { ExploreItem } from '@/lib/types/explore';
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
    queryClient,
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
    // 防止重复发送
    if (isSending) return;

    try {
      setIsSending(true);

      if (editingContent) {
        // 如果我们正在编辑现有讨论
        const discussionData: ObjectDiscussionData = {
          ...editingContent,
          suggestedPrice: data.price,
          location: data.location,
          meetingTime: data.meetingTime,
        };

        // 检查内容是否被修改
        if (!isDiscussionModified(discussionData, messages)) {
          alert(dict?.objectDiscussion?.noChangesMessage || "Please modify the price, location, or meeting time before sending a new proposal.");
          return;
        }

        await sendMessage(discussionData);
        setEditingContent(null);
        setShowPosts(false);
      } else if (selectedPost) {
        // 如果我们正在创建新讨论
        const discussionData: ObjectDiscussionData = {
          type: 'object_discussion',
          postId: selectedPost._id,
          imageUrl: selectedPost.imageUrl,
          description: selectedPost.description,
          originalPrice: selectedPost.price,
          suggestedPrice: data.price,
          currency: selectedPost.currency,
          location: data.location,
          meetingTime: data.meetingTime,
          historyId: selectedPost.historyId,
        };

        await sendMessage(discussionData);
        setSelectedPost(null);
        setShowPosts(false);
      }
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
    isPostInDiscussion: objectDiscussion.isPostInDiscussion,
  };
} 