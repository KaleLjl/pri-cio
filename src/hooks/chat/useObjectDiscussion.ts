import { useState, FormEvent, ChangeEvent } from 'react';
import { ObjectDiscussionData } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { v4 as uuidv4 } from 'uuid';
import { priceValidation, meetingValidation, dealingValidation } from '@/lib/utils/ObjectDiscussionValidation';
import { UseObjectDiscussionProps, ObjectDiscussionFormData } from '@/lib/types/objectDiscussion';
import { objectDiscussionApiService } from '@/lib/services/api/chat/objectDiscussionService';

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

  const handleDealComplete = async (currentContent: ObjectDiscussionData, senderId: string) => {
    try {
      // Complete the deal using the service
      await objectDiscussionApiService.completeDeal(currentContent);
      
      // Send a message about the completed deal
      const completedMessage: ObjectDiscussionData = {
        type: 'object_discussion',
        postId: currentContent.postId,
        status: 'completed',
        suggestedPrice: currentContent.suggestedPrice,
        originalPrice: currentContent.originalPrice,
        currency: currentContent.currency,
        location: currentContent.location,
        meetingTime: currentContent.meetingTime,
        images: currentContent.images,
        description: currentContent.description,
        historyId: currentContent.historyId,
        discussingId: currentContent.discussingId
      };
      
      await sendMessage(completedMessage);
      
      return true;
    } catch (error) {
      console.error('Error completing deal:', error);
      throw new Error(dict?.objectDiscussion?.dealError || 'Failed to complete deal');
    }
  };

  const handleCancelDiscussion = async (currentContent: ObjectDiscussionData, senderId?: string) => {
    try {
      // Cancel the discussion using the service
      await objectDiscussionApiService.cancelDiscussion(currentContent.postId);
      
      // Send a cancellation message
      const cancelMessage: ObjectDiscussionData = {
        type: 'object_discussion',
        postId: currentContent.postId,
        status: 'canceled',
        suggestedPrice: currentContent.suggestedPrice,
        originalPrice: currentContent.originalPrice,
        currency: currentContent.currency,
        location: currentContent.location,
        meetingTime: currentContent.meetingTime,
        images: currentContent.images,
        description: currentContent.description,
        historyId: currentContent.historyId,
        discussingId: currentContent.discussingId
      };
      
      await sendMessage(cancelMessage);
      
      return true;
    } catch (error) {
      console.error('Error cancelling discussion:', error);
      throw new Error('Failed to cancel discussion');
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