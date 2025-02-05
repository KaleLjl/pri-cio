import { useState } from 'react';
import { ObjectDiscussionData } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { socketService } from '@/lib/socket';
import { useLanguage } from '@/lib/context/LanguageContext';

interface UseObjectDiscussionProps {
  currentUserId: string;
  sendMessage: (content: ObjectDiscussionData) => Promise<void>;
  queryClient: any; // You should import QueryClient type from react-query
  messages: Array<{ content: any; _id: string; senderId: string; receiverId: string }>;
}

export const useObjectDiscussion = ({
  currentUserId,
  sendMessage,
  queryClient,
  messages,
}: UseObjectDiscussionProps) => {
  const { dict } = useLanguage();
  const [selectedPost, setSelectedPost] = useState<ExploreItem | null>(null);
  const [editingContent, setEditingContent] = useState<ObjectDiscussionData | null>(null);

  // Check if the discussion data has been modified
  const isDiscussionModified = (
    currentContent: ObjectDiscussionData,
    messages: Array<{ content: any; _id: string }>,
  ) => {
    // Get the last discussion message for this post
    const lastDiscussion = messages
      .filter(
        (msg) =>
          typeof msg.content !== 'string' &&
          msg.content.type === 'object_discussion' &&
          msg.content.postId === currentContent.postId,
      )
      .pop();

    if (!lastDiscussion || typeof lastDiscussion.content === 'string') return true;

    const lastContent = lastDiscussion.content as ObjectDiscussionData;

    // Check if any of the negotiable fields have been modified
    return (
      currentContent.suggestedPrice !== lastContent.suggestedPrice ||
      currentContent.location !== lastContent.location ||
      currentContent.meetingTime !== lastContent.meetingTime
    );
  };

  // Check if this is the last discussion message for this post
  const isLastDiscussionMessage = (
    message: { content: any; _id: string },
    messages: Array<{ content: any; _id: string }>,
  ) => {
    if (typeof message.content === 'string') return false;
    const content = message.content as ObjectDiscussionData;

    const discussionMessages = messages.filter((msg) => {
      if (typeof msg.content === 'string') return false;
      const msgContent = msg.content as ObjectDiscussionData;
      return (
        msgContent.type === 'object_discussion' && msgContent.postId === content.postId
      );
    });

    return discussionMessages[discussionMessages.length - 1]._id === message._id;
  };

  // Check if any discussion for this post is completed
  const isPostCompleted = (
    postId: string,
    messages: Array<{ content: any }>,
  ) => {
    return messages.some(
      (msg) =>
        typeof msg.content !== 'string' &&
        msg.content.type === 'object_discussion' &&
        msg.content.postId === postId &&
        msg.content.isCompleted,
    );
  };

  // Update this function to determine if current user is the seller based on history
  const isCurrentUserSeller = (
    postId: string,
    myPosts: ExploreItem[],
    userPosts: ExploreItem[],
  ) => {
    // If the post is from my posts (bottom + button), current user is the seller
    if (myPosts.some((post) => post._id === postId)) {
      return true;
    }
    // If the post is from other user's posts (top posts list), current user is the buyer
    if (userPosts.some((post) => post._id === postId)) {
      return false;
    }
    // Default to false if we can't determine
    return false;
  };

  // Add new function to check if a post is already in discussion
  const isPostInDiscussion = (postId: string) => {
    return messages.some(
      (msg) =>
        typeof msg.content !== 'string' &&
        msg.content.type === 'object_discussion' &&
        msg.content.postId === postId &&
        !msg.content.isCompleted
    );
  };

  const handleDiscussionSubmit = (data: {
    price: string;
    location: string;
    meetingTime: string;
  }) => {
    if (editingContent) {
      // If we're editing an existing discussion
      const discussionData: ObjectDiscussionData = {
        ...editingContent,
        suggestedPrice: data.price,
        location: data.location,
        meetingTime: data.meetingTime,
      };

      // Check if the content has been modified
      if (!isDiscussionModified(discussionData, messages)) {
        alert(dict.objectDiscussion?.noChangesMessage || "Please modify the price, location, or meeting time before sending a new proposal.");
        return;
      }

      sendMessage(discussionData);
      setEditingContent(null);
    } else if (selectedPost) {
      // If we're creating a new discussion
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

      // For new discussions, we don't need to check for modifications
      sendMessage(discussionData);
      setSelectedPost(null);
    }
  };

  const handleObjectDiscussionClick = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
    messages: Array<{ content: any; senderId: string; receiverId: string }>,
  ) => {
    // If the content is already completed, don't do anything
    if (currentContent.isCompleted) return;

    // If the message is from the current user, do nothing
    if (senderId === currentUserId) return;

    // Set the content for editing
    setEditingContent(currentContent);
  };

  const handleDealComplete = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
    messages: Array<{ content: any; senderId: string; receiverId: string }>,
  ) => {
    // If the content is already completed, don't do anything
    if (currentContent.isCompleted) return;

    try {
      // First unpublish if it's a deal completion
      if (currentContent.postId && currentContent.historyId) {
        // 确定买家和卖家的ID
        const isSeller = isCurrentUserSeller(currentContent.postId, [], []); // You need to pass actual myPosts and userPosts here

        // 获取当前用户的ID和对方的ID
        const currentMessage = messages.find(
          (msg) =>
            typeof msg.content !== 'string' &&
            msg.content.type === 'object_discussion' &&
            msg.content.postId === currentContent.postId,
        );

        if (!currentMessage) {
          throw new Error('Message not found');
        }

        const { senderId: msgSenderId, receiverId: msgReceiverId } = currentMessage;

        // 使用消息中的 senderId 和 receiverId 来确定买卖双方
        const buyerId = isSeller ? msgReceiverId : msgSenderId;
        const sellerId = isSeller ? msgSenderId : msgReceiverId;

        // 验证买家和卖家ID是否存在
        if (!buyerId || !sellerId) {
          throw new Error('Buyer or seller ID is missing');
        }

        const response = await fetch(`/api/chat/deal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            historyId: currentContent.historyId,
            exploreId: currentContent.postId,
            buyerId,
            sellerId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to complete deal');
        }

        // Invalidate the explore posts query to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ['explore-posts'] });

        // Get the seller's ID (the post owner)
        const sellerResponse = await fetch('/api/users/me');
        if (sellerResponse.ok) {
          const sellerData = await sellerResponse.json();
          // Emit socket event to notify both users
          socketService.emitExplorePostsUpdate(buyerId); // Notify the buyer
          socketService.emitExplorePostsUpdate(sellerData._id); // Notify the seller
        }
      }

      // Then mark the discussion as completed
      const updatedContent = {
        ...currentContent,
        isCompleted: true,
      };
      sendMessage(updatedContent);
    } catch (error) {
      console.error('Error completing deal:', error);
      throw error;
    }
  };

  return {
    selectedPost,
    setSelectedPost,
    editingContent,
    setEditingContent,
    isDiscussionModified,
    isLastDiscussionMessage,
    isPostCompleted,
    isCurrentUserSeller,
    isPostInDiscussion,
    handleDiscussionSubmit,
    handleObjectDiscussionClick,
    handleDealComplete,
  };
}; 