import { useState, FormEvent, ChangeEvent } from 'react';
import { ObjectDiscussionData } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { v4 as uuidv4 } from 'uuid';
import { priceValidation, meetingValidation, dealingValidation } from '@/lib/utils/ObjectDiscussionValidation';
import { UseObjectDiscussionProps, ObjectDiscussionFormData } from '@/lib/types/objectDiscussion';

export const useObjectDiscussion = ({
  currentUserId,
  messages,
  sendMessage,
  queryClient,
  dict = { 
    objectDiscussion: { 
      dealError: 'Failed to complete deal. Please try again.',
      alreadyInDiscussion: 'This item is already in discussion.',
      inDiscussion: 'In Discussion',
      invalidMeetingTime: 'Meeting time must be set and in the future',
      invalidLocation: 'Meeting location must be specified',
      validationError: 'Invalid meeting details. Please ensure meeting time and location are properly set.',
      invalidPrice: 'Price must be a valid number greater than 0',
    } 
  },
}: UseObjectDiscussionProps) => {
  // Discussion state
  const [selectedPost, setSelectedPost] = useState<ExploreItem | null>(null);
  const [editingContent, setEditingContent] = useState<ObjectDiscussionData | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Form state
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [meetingTime, setMeetingTime] = useState('');

  // Utility functions
  const getPrimaryImage = (images: Array<{id: string, url: string, isPrimary: boolean}>) => {
    const primaryImage = images.find(img => img.isPrimary) || images[0];
    return primaryImage?.url || '';
  };

  // Form handlers
  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setPrice(value);
    }
  };

  const handleLocationChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value);
  };

  const handleMeetingTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMeetingTime(e.target.value);
  };

  const initializeFormValues = (initialPrice = '', initialLocation = '', initialMeetingTime = '') => {
    setPrice(initialPrice);
    setLocation(initialLocation);
    setMeetingTime(initialMeetingTime);
  };

  const handleFormSubmit = (e: FormEvent, onSubmit: (data: ObjectDiscussionFormData) => void) => {
    e.preventDefault();
    onSubmit({
      price,
      location,
      meetingTime,
    });
  };

  // Discussion state checks
  const isDiscussionModified = (
    currentContent: ObjectDiscussionData,
    messages: Array<{ content: any; _id: string }>,
  ) => {
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

    return (
      currentContent.suggestedPrice !== lastContent.suggestedPrice ||
      currentContent.location !== lastContent.location ||
      currentContent.meetingTime !== lastContent.meetingTime
    );
  };

  const isPostInDiscussion = (postId: string) => {
    const discussionMessages = messages.filter(msg =>
      typeof msg.content !== 'string' &&
      msg.content.type === 'object_discussion' &&
      msg.content.postId === postId
    );

    if (discussionMessages.length === 0) return false;

    const latestMessage = discussionMessages[discussionMessages.length - 1];
    const latestDiscussingId = (latestMessage.content as ObjectDiscussionData).discussingId;

    const latestDiscussion = discussionMessages.filter(
      msg => typeof msg.content !== 'string' && 
      (msg.content as ObjectDiscussionData).discussingId === latestDiscussingId
    );

    const lastMessageOfLatestDiscussion = latestDiscussion[latestDiscussion.length - 1];
    return (lastMessageOfLatestDiscussion.content as ObjectDiscussionData).status === 'discussing';
  };

  const isPostFinalized = (
    postId: string,
    discussingId: string,
    messages: Array<{ content: any }>,
  ): boolean => {
    const discussionMessages = messages.filter(
      (msg) =>
        typeof msg.content !== 'string' &&
        msg.content.type === 'object_discussion' &&
        msg.content.discussingId === discussingId
    );

    if (discussionMessages.length === 0) return false;

    const lastMessage = discussionMessages[discussionMessages.length - 1];
    return (lastMessage.content as ObjectDiscussionData).status === 'completed' || 
           (lastMessage.content as ObjectDiscussionData).status === 'canceled';
  };

  const isLastDiscussionMessage = (
    message: { content: any; _id: string },
    messages: Array<{ content: any; _id: string }>,
  ) => {
    if (typeof message.content === 'string') return false;
    const content = message.content as ObjectDiscussionData;

    const discussionMessages = messages.filter((msg) => {
      if (typeof msg.content === 'string') return false;
      const msgContent = msg.content as ObjectDiscussionData;
      return msgContent.type === 'object_discussion' && msgContent.postId === content.postId;
    });

    return discussionMessages[discussionMessages.length - 1]._id === message._id;
  };

  const isCurrentUserSeller = (postId: string, myPosts: ExploreItem[], userPosts: ExploreItem[]) => {
    if (myPosts.some((post) => post._id === postId)) return true;
    if (userPosts.some((post) => post._id === postId)) return false;
    return false;
  };

  const isPostCompleted = (postId: string, messages: Array<{ content: any }>): boolean => {
    const discussionMessages = messages.filter(
      (msg) => typeof msg.content !== 'string' &&
      msg.content.type === 'object_discussion' &&
      msg.content.postId === postId
    );
    if (discussionMessages.length === 0) return false;
    const lastMessage = discussionMessages[discussionMessages.length - 1];
    return (lastMessage.content as ObjectDiscussionData).status === 'completed';
  };

  // Action handlers
  const handleDiscussionSubmit = async (data: ObjectDiscussionFormData) => {
    const priceValidationResult = priceValidation.validate(data.price);
    if (!priceValidationResult.isValid) {
      const errorMessage = priceValidationResult.error || dict?.objectDiscussion?.invalidPrice;
      if (typeof window !== 'undefined') alert(errorMessage);
      throw new Error(errorMessage);
    }
    
    const locationValidationResult = meetingValidation.isValidLocation(data.location);
    if (!locationValidationResult) {
      const errorMessage = dict?.objectDiscussion?.invalidLocation || 'Meeting location must be specified';
      if (typeof window !== 'undefined') alert(errorMessage);
      throw new Error(errorMessage);
    }
    
    const timeValidationResult = meetingValidation.isValidTime(data.meetingTime);
    if (!timeValidationResult) {
      const errorMessage = dict?.objectDiscussion?.invalidMeetingTime || 'Meeting time must be set and in the future';
      if (typeof window !== 'undefined') alert(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      setIsSending(true);

      if (editingContent) {
        const discussionData: ObjectDiscussionData = {
          ...editingContent,
          suggestedPrice: data.price,
          location: data.location,
          meetingTime: data.meetingTime,
          status: 'discussing'
        };

        await sendMessage(discussionData);
        setEditingContent(null);
      } else if (selectedPost) {
        const discussionData: ObjectDiscussionData = {
          type: 'object_discussion',
          postId: selectedPost._id,
          images: selectedPost.images || [],
          imageUrl: selectedPost.imageUrl,
          description: selectedPost.description,
          originalPrice: selectedPost.price,
          suggestedPrice: data.price,
          currency: selectedPost.currency,
          location: data.location,
          meetingTime: data.meetingTime,
          status: 'discussing',
          historyId: selectedPost.historyId,
          discussingId: uuidv4()
        };

        await sendMessage(discussionData);
        setSelectedPost(null);
      }
    } catch (error) {
      console.error('Error in handleDiscussionSubmit:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleObjectDiscussionClick = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
  ) => {
    if (currentContent.status !== 'discussing') return;
    if (senderId === currentUserId) return;
    setEditingContent(currentContent);
  };

  const handleDealComplete = async (
    currentContent: ObjectDiscussionData,
    senderId: string,
  ) => {
    if (currentContent.status !== 'discussing') return;

    const validation = dealingValidation(currentContent);
    if (!validation.isValid) {
      const errorMessage = validation.errorMessage || dict?.objectDiscussion?.validationError;
      if (typeof window !== 'undefined') alert(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      setIsSending(true);
      
      if (currentContent.postId && currentContent.historyId) {
        const response = await fetch(`/api/chat/deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            historyId: currentContent.historyId,
            exploreId: currentContent.postId,
            buyerId: senderId === currentUserId ? currentUserId : messages[0].senderId,
            sellerId: senderId === currentUserId ? messages[0].senderId : currentUserId,
            meetingTime: currentContent.meetingTime,
            location: currentContent.location
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to complete deal');
        }
      }

      await sendMessage({
        ...currentContent,
        status: 'completed' as const
      });
    } catch (error) {
      console.error('Error completing deal:', error);
      const DEFAULT_ERROR = 'Failed to complete deal. Please try again.';
      const errorMessage = error instanceof Error ? error.message : dict?.objectDiscussion?.dealError ?? DEFAULT_ERROR;
      if (typeof window !== 'undefined') alert(errorMessage);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelDiscussion = async (
    currentContent: ObjectDiscussionData,
    senderId?: string,
  ) => {
    try {
      setIsSending(true);
      await sendMessage({
        ...currentContent,
        status: 'canceled' as const
      });
    } catch (error) {
      console.error('Error canceling discussion:', error);
      const DEFAULT_ERROR = 'Failed to cancel deal. Please try again.';
      const errorMessage = dict?.objectDiscussion?.dealError ?? DEFAULT_ERROR;
      if (typeof window !== 'undefined') alert(errorMessage);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return {
    // States
    selectedPost,
    setSelectedPost,
    editingContent,
    setEditingContent,
    isSending,
    
    // Utility functions
    getPrimaryImage,
    initializeFormValues,
    
    // Form states and handlers
    price,
    location,
    meetingTime,
    handlePriceChange,
    handleLocationChange,
    handleMeetingTimeChange,
    handleFormSubmit,
    
    // Validation helpers
    isDiscussionModified,
    isLastDiscussionMessage,
    isPostInDiscussion,
    isPostFinalized,
    isCurrentUserSeller,
    isPostCompleted,
    
    // Action handlers
    handleDiscussionSubmit,
    handleObjectDiscussionClick,
    handleDealComplete,
    handleCancelDiscussion,
  };
}; 