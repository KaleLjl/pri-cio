import { ObjectDiscussionData } from './chat';
import { ExploreItem } from './explore';
import { QueryClient } from '@tanstack/react-query';
import { ChangeEvent, FormEvent } from 'react';

export interface ObjectDiscussionProps {
  post: {
    _id: string;
    images: Array<{
      id: string;
      url: string;
      isPrimary: boolean;
    }>;
    description: string;
    price: string;
    currency: string;
    historyId: string;
    location?: {
      city: string;
      country: string;
    };
  };
  initialValues?: {
    price: string;
    location: string;
    meetingTime: string;
  };
  onClose: () => void;
  onSubmit: (data: ObjectDiscussionFormData) => void;
}

export interface UseObjectDiscussionFormProps {
  initialPrice?: string;
  initialLocation?: string;
  initialMeetingTime?: string;
  onSubmit: (data: { 
    price: string; 
    location: string; 
    meetingTime: string; 
  }) => void;
}

export interface UseObjectDiscussionProps {
  currentUserId: string;
  messages: Array<{ 
    content: any; 
    _id: string; 
    senderId: string; 
    receiverId: string;
    conversationId: string;
  }>;
  sendMessage: (content: ObjectDiscussionData | string) => Promise<void>;
  queryClient?: QueryClient;
  setShowPosts?: (show: boolean) => void;
  dict?: {
    objectDiscussion?: {
      dealError?: string;
      noChangesMessage?: string;
      alreadyInDiscussion?: string;
      inDiscussion?: string;
      invalidMeetingTime?: string;
      invalidLocation?: string;
      validationError?: string;
      invalidPrice?: string;
    };
  };
}

export interface ObjectDiscussionFormData {
  price: string;
  location: string;
  meetingTime: string;
}

export interface ObjectDiscussionContextType {
  selectedPost: ExploreItem | null;
  setSelectedPost: (post: ExploreItem | null) => void;
  editingContent: ObjectDiscussionData | null;
  setEditingContent: (content: ObjectDiscussionData | null) => void;
  isSending: boolean;
  price: string;
  location: string;
  meetingTime: string;
  getPrimaryImage: (images: Array<{id: string, url: string, isPrimary: boolean}>) => string;
  initializeFormValues: (initialPrice?: string, initialLocation?: string, initialMeetingTime?: string) => void;
  handlePriceChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleLocationChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleMeetingTimeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleFormSubmit: (e: FormEvent, onSubmit: (data: ObjectDiscussionFormData) => void) => void;
  isDiscussionModified: (currentContent: ObjectDiscussionData, messages: Array<{ content: any; _id: string }>) => boolean;
  isLastDiscussionMessage: (message: { content: any; _id: string }, messages: Array<{ content: any; _id: string }>) => boolean;
  isPostInDiscussion: (postId: string) => boolean;
  isPostFinalized: (postId: string, discussingId: string, messages: Array<{ content: any }>) => boolean;
  isCurrentUserSeller: (postId: string, myPosts: ExploreItem[], userPosts: ExploreItem[]) => boolean;
  isPostCompleted: (postId: string, messages: Array<{ content: any }>) => boolean;
  handleDiscussionSubmit: (data: ObjectDiscussionFormData) => Promise<void>;
  handleObjectDiscussionClick: (currentContent: ObjectDiscussionData, senderId: string) => Promise<void>;
  handleDealComplete: (currentContent: ObjectDiscussionData, senderId: string) => Promise<void>;
  handleCancelDiscussion: (currentContent: ObjectDiscussionData, senderId?: string) => Promise<void>;
} 