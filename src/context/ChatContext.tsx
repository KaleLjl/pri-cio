import React, { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import { useChatHistory } from '@/hooks/useChatHistory';
import { ObjectDiscussionData } from '@/lib/types/chat';
import { ExploreItem } from '@/lib/types/explore';
import {
  useInitializeChat,
  useChatData,
  useMessageActions,
  useChatUI,
} from '@/hooks/chat';
import { useObjectDiscussion } from '@/hooks/chat/useObjectDiscussion';

// Define the ChatContext type
type ChatContextType = {
  // Chat initialization
  currentUserId: string | null;
  otherUser: any | null;
  conversationId: string;
  isInitializing: boolean;
  error: string | null;
  
  // Chat data
  messages: any[];
  userPosts: ExploreItem[];
  isLoadingPosts: boolean;
  isTyping: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  
  // UI state
  messagesEndRef: any;
  messagesContainerRef: any;
  loadMoreRef: any;
  inputMessage: string;
  showPosts: boolean;
  showMyPosts: boolean;
  myPosts: ExploreItem[];
  isLoadingMyPosts: boolean;
  loadingMore: boolean;
  setShowMyPosts: (show: boolean) => void;
  setShowPosts: (show: boolean) => void;
  handleScroll: (e?: React.UIEvent<HTMLDivElement>) => void;
  handleTogglePosts: () => void;
  handlePostClick: (post: ExploreItem) => void;
  handleMessageInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleMessageSubmit: (message: string) => void;
  
  // Message actions
  sendMessage: (content: string | ObjectDiscussionData) => Promise<void>;
  deleteMessages: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => void;
  isSendingMessage: boolean;
  isDeleting: boolean;
  
  // Object discussion
  selectedPost: ExploreItem | null;
  editingContent: ObjectDiscussionData | null;
  setSelectedPost: (post: ExploreItem | null) => void;
  handleDiscussionSubmit: (data: any) => Promise<void>;
  handleObjectDiscussionClick: (currentContent: ObjectDiscussionData, senderId: string) => void;
  handleDealComplete: (content: ObjectDiscussionData, senderId: string) => Promise<boolean>;
  handleCancelDiscussion: (content: ObjectDiscussionData) => Promise<boolean>;
  isCurrentUserSeller: (postId: string, myPosts: ExploreItem[], userPosts: ExploreItem[]) => boolean;
  isPostCompleted: (postId: string, messages: any[]) => boolean;
  isLastDiscussionMessage: (message: any, messages: any[]) => boolean;
  setEditingContent: (content: ObjectDiscussionData | null) => void;
  isPostInDiscussion: (postId: string) => boolean;
  isPostFinalized: (postId: string, discussingId: string, messages: any[]) => boolean;
  isSending: boolean;
  
  // Navigation
  router: ReturnType<typeof useRouter>;
  
  // Utility
  dict: any;
  lang: string;
  getPrimaryImage: (images: Array<{id: string, url: string, isPrimary: boolean}>) => string;
};

// Create the context
const ChatContext = createContext<ChatContextType | null>(null);

// Custom hook to use the chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

// Utility function for getting primary image
export const getPrimaryImage = (images: Array<{id: string, url: string, isPrimary: boolean}>) => {
  const primaryImage = images.find(img => img.isPrimary) || images[0];
  return primaryImage?.url || '';
};

// Chat provider component
export const ChatProvider = ({ children, userId }: { children: ReactNode; userId: string }) => {
  const { dict, lang } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { markAsRead } = useChatHistory();

  // Initialize chat data
  const {
    currentUserId,
    otherUser,
    conversationId,
    isInitializing,
    error,
  } = useInitializeChat({ userId });

  // Get chat data
  const {
    messages,
    userPosts,
    isLoadingPosts,
    isTyping,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useChatData({
    userId,
    conversationId,
    otherUser,
  });

  // Chat UI state and handlers
  const {
    messagesEndRef,
    messagesContainerRef,
    loadMoreRef,
    inputMessage,
    showPosts,
    showMyPosts,
    myPosts,
    isLoadingMyPosts,
    loadingMore,
    setShowMyPosts,
    setShowPosts,
    handleScroll,
    handleTogglePosts,
    handlePostClick,
    handleMessageInput,
    handleMessageSubmit,
  } = useChatUI({
    messages,
    currentUserId: currentUserId ?? undefined,
    conversationId,
    fetchNextPage,
    hasNextPage,
  });

  // Message actions
  const {
    sendMessage: originalSendMessage,
    deleteMessages,
    handleSubmit,
    isDeleting,
    isLoading: isSendingMessage,
  } = useMessageActions({
    conversationId,
    currentUserId: currentUserId ?? undefined,
    otherUserId: otherUser?._id ?? undefined,
    handleMessageSubmit,
  });

  const sendMessage = async (content: string | ObjectDiscussionData): Promise<void> => {
    await originalSendMessage(content as any);
  };

  // Object discussion integration
  const objectDiscussionState = useObjectDiscussion({
    currentUserId: currentUserId || '',
    messages,
    sendMessage,
    queryClient,
    setShowPosts,
    dict,
  });

  // Extract all the object discussion properties
  const {
    selectedPost,
    editingContent,
    setSelectedPost,
    handleDiscussionSubmit,
    handleObjectDiscussionClick,
    handleDealComplete,
    handleCancelDiscussion,
    isCurrentUserSeller,
    isPostCompleted,
    isLastDiscussionMessage,
    setEditingContent,
    isPostInDiscussion,
    isPostFinalized,
    isSending
  } = objectDiscussionState;

  // Mark messages as read when conversation loads
  React.useEffect(() => {
    if (conversationId) {
      markAsRead(conversationId).catch(error => {
        console.error("Failed to mark messages as read:", error);
      });
    }
  }, [conversationId, markAsRead]);

  // Context value
  const value = {
    // Chat initialization
    currentUserId,
    otherUser,
    conversationId,
    isInitializing,
    error,
    
    // Chat data
    messages,
    userPosts,
    isLoadingPosts,
    isTyping,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    
    // UI state
    messagesEndRef,
    messagesContainerRef,
    loadMoreRef,
    inputMessage,
    showPosts,
    showMyPosts,
    myPosts,
    isLoadingMyPosts,
    loadingMore,
    setShowMyPosts,
    setShowPosts,
    handleScroll,
    handleTogglePosts,
    handlePostClick,
    handleMessageInput,
    handleMessageSubmit,
    
    // Message actions
    sendMessage,
    deleteMessages,
    handleSubmit,
    isSendingMessage,
    isDeleting,
    
    // Object discussion
    selectedPost,
    editingContent,
    setSelectedPost,
    handleDiscussionSubmit,
    handleObjectDiscussionClick,
    handleDealComplete,
    handleCancelDiscussion,
    isCurrentUserSeller,
    isPostCompleted,
    isLastDiscussionMessage,
    setEditingContent,
    isPostInDiscussion,
    isPostFinalized,
    isSending,
    
    // Navigation
    router,
    
    // Utility
    dict,
    lang,
    getPrimaryImage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}; 