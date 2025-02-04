export interface ChatUser {
  _id: string;
  name: string;
  avatarUrl?: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

export interface ObjectDiscussionData {
  type: 'object_discussion';
  postId: string;
  imageUrl: string;
  description: string;
  originalPrice: string;
  suggestedPrice: string;
  currency: string;
  location: string;
  meetingTime: string;
  isCompleted?: boolean;
  historyId?: string;
}

export type MessageContent = string | ObjectDiscussionData;

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