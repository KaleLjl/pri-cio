export interface ChatUser {
  _id: string;
  name: string;
  avatarUrl?: string;
}

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "error";

export interface ObjectDiscussionData {
  type: "object_discussion";
  postId: string;
  images: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
  imageUrl?: string;
  description: string;
  suggestedPrice: string;
  originalPrice: string;
  currency: string;
  location: string;
  meetingTime: string;
  status: "discussing" | "completed" | "canceled";
  historyId: string;
  discussingId?: string;
}

import { ObjectId } from "mongodb"; // Add ObjectId import

export type MessageContent = string | ObjectDiscussionData;

// Interface representing the schema stored in MongoDB
export interface MessageDBSchema {
  _id: ObjectId;
  conversationId: ObjectId;
  content: MessageContent;
  senderId: ObjectId; // Assuming senderId is stored as ObjectId
  receiverId: ObjectId; // Assuming receiverId is stored as ObjectId
  createdAt: Date;
  status?: MessageStatus;
  read?: boolean;
  deletedBy?: string[]; // Assuming deletedBy stores user IDs as strings
}

// Interface representing the data structure used in the application code
export interface ChatMessage {
  _id: string;
  conversationId: string;
  content: MessageContent;
  senderId: string;
  receiverId: string;
  createdAt: string;
  status?: MessageStatus;
  read?: boolean;
}

export interface ChatProps {
  userId: string;
}

export interface UseChatProps {
  conversationId: string;
  currentUserId: string;
  otherUser: ChatUser;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextPage?: number;
}

export interface MutationContext {
  optimisticMessage: ChatMessage;
}

export interface ChatHistoryRecord {
  _id: string;
  participants: {
    _id: string;
    name: string;
    avatarUrl: string;
  }[];
  lastMessage?: {
    _id: string;
    content: string;
    createdAt: string;
    senderId: string;
  };
  updatedAt: string;
}

export interface ChatRecord {
  _id: string;
  participants: {
    _id: string;
    name: string;
    avatarUrl?: string;
  }[];
  lastMessage?: {
    _id: string;
    content: MessageContent;
    createdAt: string;
    senderId: string;
  };
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
}

export interface ChatHookResult {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  inputMessage: string;
  isSending: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  setInputMessage: (value: string) => void;
  sendMessage: (content: MessageContent) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  deleteMessages: () => Promise<void>;
}
