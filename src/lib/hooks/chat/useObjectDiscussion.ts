import { useState, FormEvent, ChangeEvent } from 'react';
import { ObjectDiscussionData } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import { v4 as uuidv4 } from 'uuid';
import { UseObjectDiscussionProps, ObjectDiscussionFormData } from '@/lib/types/objectDiscussion';

// Validation logic
const priceValidation = {
  isValidFormat: (price: string): boolean => {
    return /^\d+(\.\d{0,2})?$/.test(price);
  },

  isPositive: (price: string): boolean => {
    const numericPrice = parseFloat(price);
    return numericPrice > 0;
  },

  validate: (price: string): { isValid: boolean; error?: string } => {
    if (!price) {
      return { isValid: false, error: 'Price is required' };
    }
    if (!priceValidation.isValidFormat(price)) {
      return { isValid: false, error: 'Invalid price format. Price must be a number with at most 2 decimal places.' };
    }
    if (!priceValidation.isPositive(price)) {
      return { isValid: false, error: 'Price must be greater than 0' };
    }
    return { isValid: true };
  }
};

const meetingValidation = {
  isValidTime: (time: string): boolean => {
    if (!time) return false;
    const meetingDate = new Date(time);
    const now = new Date();
    return meetingDate > now;
  },

  isValidLocation: (location: string): boolean => {
    return Boolean(location && location.trim().length > 0);
  },

  validate: (data: { meetingTime: string; location: string }): { isValid: boolean; error?: string } => {
    if (!data.meetingTime) {
      return { isValid: false, error: 'Meeting time is required' };
    }
    if (!meetingValidation.isValidTime(data.meetingTime)) {
      return { isValid: false, error: 'Meeting time must be in the future' };
    }
    if (!meetingValidation.isValidLocation(data.location)) {
      return { isValid: false, error: 'Location is required' };
    }
    return { isValid: true };
  }
};

const dealingValidation = (content: ObjectDiscussionData): { isValid: boolean; errorMessage?: string } => {
  if (!content?.suggestedPrice) {
    return {
      isValid: false,
      errorMessage: 'Please set a price before completing the deal'
    };
  }

  if (!content?.meetingTime || !content?.location) {
    return {
      isValid: false,
      errorMessage: 'Please set meeting time and location before completing the deal'
    };
  }

  return {
    isValid: true
  };
};

export const useObjectDiscussion = ({
  currentUserId,
  messages,
  sendMessage,
  queryClient,
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
      const errorMessage = priceValidationResult.error || 'Price must be a valid number greater than 0';
      if (typeof window !== 'undefined') alert(errorMessage);
      throw new Error(errorMessage);
    }
    
    const locationValidationResult = meetingValidation.isValidLocation(data.location);
    if (!locationValidationResult) {
      const errorMessage = 'Meeting location must be specified';
      if (typeof window !== 'undefined') alert(errorMessage);
      throw new Error(errorMessage);
    }
    
    const timeValidationResult = meetingValidation.isValidTime(data.meetingTime);
    if (!timeValidationResult) {
      const errorMessage = 'Meeting time must be set and in the future';
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

    // Validate required fields
    if (!currentContent.postId || !currentContent.historyId) {
      const errorMessage = 'Invalid deal data: missing required fields';
      if (typeof window !== 'undefined') alert(errorMessage);
      throw new Error(errorMessage);
    }

    const validation = dealingValidation(currentContent);
    if (!validation.isValid) {
      const errorMessage = validation.errorMessage || 'Invalid meeting details. Please ensure meeting time and location are properly set.';
      if (typeof window !== 'undefined') alert(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      setIsSending(true);
      
      // Find the other party's ID from messages
      const otherPartyMessage = messages.find(msg => 
        typeof msg.content !== 'string' && 
        msg.content.type === 'object_discussion' && 
        msg.senderId !== currentUserId
      );

      if (!otherPartyMessage) {
        throw new Error('Could not find the other party in the discussion');
      }

      // Ensure IDs are strings
      const buyerIdStr = senderId === currentUserId ? currentUserId : otherPartyMessage.senderId;
      const sellerIdStr = senderId === currentUserId ? otherPartyMessage.senderId : currentUserId;

      const response = await fetch(`/api/chat/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historyId: currentContent.historyId,
          exploreId: currentContent.postId,
          buyerId: buyerIdStr,
          sellerId: sellerIdStr,
          meetingTime: currentContent.meetingTime,
          location: currentContent.location,
          suggestedPrice: currentContent.suggestedPrice
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete deal');
      }

      await sendMessage({
        ...currentContent,
        status: 'completed' as const
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete deal. Please try again.';
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
      const errorMessage = 'Failed to cancel deal. Please try again.';
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