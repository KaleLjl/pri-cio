import { ObjectDiscussionData } from './chat';
import { QueryClient } from '@tanstack/react-query';

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
  onSubmit: (data: {
    price: string;
    location: string;
    meetingTime: string;
  }) => void;
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