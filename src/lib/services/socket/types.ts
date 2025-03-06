import { Socket } from "socket.io-client";

// Basic socket events
export enum SocketEvent {
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  CONNECT_ERROR = "connect_error",
  RECONNECT = "reconnect",
  RECONNECT_ATTEMPT = "reconnect_attempt",
  RECONNECT_ERROR = "reconnect_error",
  
  // Custom events
  NEW_MESSAGE = "new-message",
  MESSAGE_DELIVERED = "message-delivered",
  MESSAGE_READ = "message-read",
  NEW_CONVERSATION = "new-conversation",
  CONVERSATION_READ = "conversation-read",
  TYPING = "typing",
  EXPLORE_POSTS_UPDATE = "explore-posts-update",
  
  // Room events
  JOIN_ROOM = "join-room",
  LEAVE_ROOM = "leave-room",
  
  // Message events
  SEND_MESSAGE = "send-message",
  SEND_TYPING = "typing",
  SEND_MESSAGE_DELIVERED = "message-delivered",
  SEND_MESSAGE_READ = "message-read",
}

// Message status types
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "error";

// Chat message interface
export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string | any;
  createdAt: string;
  updatedAt: string;
  status?: MessageStatus;
  isObjectDiscussion?: boolean;
}

// Chat conversation record 
export interface ChatRecord {
  _id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
  updatedAt: string;
  createdAt: string;
}

// New conversation data
export interface NewConversationData {
  conversationId: string;
  message: ChatMessage;
}

// Typing data
export interface TypingData {
  userId: string;
  typing: boolean;
  conversationId?: string;
}

// Conversation read data
export interface ConversationReadData {
  conversationId: string;
}

// Messages response from API
export interface MessagesResponse {
  messages: ChatMessage[];
  hasNextPage: boolean;
  nextCursor?: string;
} 