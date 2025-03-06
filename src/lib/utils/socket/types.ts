export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: any;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  createdAt: string;
  updatedAt?: string;
}

export interface NewConversationData {
  conversationId: string;
  message: ChatMessage;
}

export interface TypingData {
  userId: string;
  typing: boolean;
}

export interface ConversationReadData {
  conversationId: string;
}

export enum SocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  RECONNECT_ERROR = 'reconnect_error',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  SEND_MESSAGE = 'send_message',
  NEW_MESSAGE = 'new_message',
  SEND_TYPING = 'send_typing',
  USER_TYPING = 'user_typing',
  SEND_MESSAGE_DELIVERED = 'send_message_delivered',
  MESSAGE_DELIVERED = 'message_delivered',
  SEND_MESSAGE_READ = 'send_message_read',
  MESSAGE_READ = 'message_read',
  NEW_CONVERSATION = 'new_conversation',
  CONVERSATION_READ = 'conversation_read',
  TYPING = 'typing',
  EXPLORE_POSTS_UPDATE = 'explore_posts_update'
} 