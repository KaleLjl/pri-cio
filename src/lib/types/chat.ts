export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
  read: boolean;
}

export interface Conversation {
  _id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  updatedAt: Date;
  createdAt: Date;
}

export interface ChatUser {
  _id: string;
  name?: string;
  avatarUrl?: string;
  online?: boolean;
  lastSeen?: Date;
} 