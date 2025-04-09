export interface ChatUser {
  _id: string;
  name: string;
  avatarUrl?: string;
}

export type MessageStatus =
  | "sending"
  | "sent"
  // | "delivered" // Removed delivered status
  | "read"
  | "error"
  | "completed";

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

import { ObjectId } from "mongodb";
import { UserProfile } from "@/lib/types/user"; // Import UserProfile

export type MessageContent = string | ObjectDiscussionData;

// Represents the basic conversation document structure in MongoDB
// (May have more fields like settings, deletedBy etc.)
export interface ConversationDBSchema {
  _id: ObjectId;
  participants: string[]; // Array of user IDs as strings
  createdAt: Date;
  updatedAt: Date;
  settings?: ConversationSettings;
  deletedBy?: string[];
}

// Represents the conversation object returned by the initialize endpoint
export interface Conversation {
  _id: string;
  participants: ChatUser[]; // Array of user objects
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  settings?: ConversationSettings;
}

// Represents the structure of items returned by the list conversations endpoint
export interface ConversationListItem {
  _id: string;
  participants: UserProfile[]; // Array of full user profiles
  lastMessage: {
    _id: string;
    content: MessageContent;
    createdAt: string; // ISO Date string
    senderId: string;
    conversationId: string;
  } | null;
  updatedAt: Date; // Kept as Date from aggregation? Check route logic. Needs conversion?
  unreadCount: number;
  settings?: ConversationSettings;
}

// Represents the settings object for a conversation
export interface ConversationSettings {
  // Define specific settings fields if known, otherwise keep flexible
  notifications?: boolean;
  theme?: string;
  [key: string]: unknown; // Use unknown instead of any
}

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
  deletedBy?: string[];
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

// --- Existing Interfaces ---

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
