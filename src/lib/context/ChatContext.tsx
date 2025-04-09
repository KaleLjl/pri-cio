"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
} from "react"; // Added useEffect, useMemo
import { ChatMessage, ObjectDiscussionData } from "@/lib/types/chat";
import { ExploreItem } from "@/lib/types/explore";
import { UserProfile } from "@/lib/types/user";
import { ObjectDiscussionFormData } from "@/lib/types/objectDiscussion"; // Import the missing type
import { useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import {
  useInitializeChat,
  useChatData,
  useMessageActions,
  useChatUI, // Keep useChatUI for now, might remove later if refs stay in Chat.tsx
  useObjectDiscussion,
} from "@/lib/hooks/chat"; // Import chat hooks
import { useChatHistory } from "@/lib/hooks/useChatHistory"; // Import useChatHistory
// import { SocketContext } from "@/lib/context/SocketContext"; // REMOVED (unused for now)

// Define the shape of the context data
interface ChatContextType {
  // State from useInitializeChat
  currentUserId: string | null;
  otherUser: UserProfile | null;
  conversationId: string | null;
  isInitializing: boolean;
  error: string | null;

  // State/Functions from useChatData
  messages: ChatMessage[];
  userPosts: ExploreItem[];
  isLoadingPosts: boolean;
  isTyping: boolean;
  hasNextPage: boolean | undefined;
  fetchNextPage: () => Promise<void>; // Changed to Promise<void>
  isFetchingNextPage: boolean;

  // State/Functions from useChatUI
  inputMessage: string;
  showPosts: boolean;
  showMyPosts: boolean;
  myPosts: ExploreItem[];
  isLoadingMyPosts: boolean;
  setShowMyPosts: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPosts: React.Dispatch<React.SetStateAction<boolean>>;
  handleMessageInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleTogglePosts: () => void; // Add handleTogglePosts
  // handleScroll, refs will likely stay in Chat.tsx or useChatUI

  // State/Functions from useMessageActions
  sendMessage: (
    content: string | ObjectDiscussionData
  ) => Promise<ChatMessage | undefined>;
  deleteMessages: () => Promise<void>;
  isSendingMessage: boolean;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void; // Add handleSubmit

  // State/Functions from useObjectDiscussion
  selectedPost: ExploreItem | null;
  editingContent: ObjectDiscussionData | null;
  setSelectedPost: React.Dispatch<React.SetStateAction<ExploreItem | null>>;
  setEditingContent: React.Dispatch<
    React.SetStateAction<ObjectDiscussionData | null>
  >;
  handleDiscussionSubmit: (data: ObjectDiscussionFormData) => Promise<void>; // Use specific type
  handleConfirmAgreement: (
    content: ObjectDiscussionData,
    messageId: string
  ) => Promise<void>; // Renamed placeholder
  handleCancelDiscussion: (content: ObjectDiscussionData) => Promise<void>; // Simplified signature
  isCurrentUserSeller: (postId: string) => boolean; // Simplified signature
  isPostCompleted: (postId: string) => boolean; // Simplified signature
  isLastDiscussionMessage: (message: ChatMessage) => boolean; // Simplified signature
  isPostInDiscussion: (postId: string) => boolean;
  isPostFinalized: (postId: string, discussingId: string) => boolean; // Simplified signature
  isSending: boolean; // From useObjectDiscussion

  // Functions from useChatHistory (via ChatProvider)
  markAsRead: (conversationId: string) => Promise<void>;
}

// Create the context with a default value
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Create a provider component
interface ChatProviderProps {
  children: ReactNode;
  userId: string; // Pass the target user ID for the chat
}

export const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  userId, // This is the target user ID for the chat
}) => {
  const queryClient = useQueryClient();
  const { markAsRead, chats } = useChatHistory(); // For marking conversation read

  // --- Integrate Hooks ---
  const { currentUserId, otherUser, conversationId, isInitializing, error } =
    useInitializeChat({ userId });

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

  // Note: Refs and scroll handler from useChatUI might need to stay in Chat.tsx
  // We only bring state and simple handlers into the context for now.
  const {
    inputMessage,
    showPosts,
    showMyPosts,
    myPosts,
    isLoadingMyPosts,
    setShowMyPosts,
    setShowPosts,
    handleMessageInput,
    handleMessageSubmit, // Pass this to useMessageActions
    handleTogglePosts, // Get from useChatUI
  } = useChatUI({
    messages,
    currentUserId: currentUserId ?? undefined,
    conversationId,
    fetchNextPage,
    hasNextPage,
  });

  const {
    sendMessage,
    deleteMessages,
    handleSubmit, // This is the form submit handler from useChatUI via useMessageActions
    isSending: isSendingMessage, // Renamed to avoid conflict
  } = useMessageActions({
    conversationId,
    currentUserId: currentUserId ?? undefined,
    otherUserId: otherUser?._id ?? undefined,
    handleMessageSubmit, // Pass the callback
  });

  const {
    selectedPost,
    editingContent,
    setSelectedPost,
    setEditingContent,
    handleDiscussionSubmit,
    handleConfirmAgreement, // Use the renamed function
    handleCancelDiscussion,
    isCurrentUserSeller,
    isPostCompleted,
    isLastDiscussionMessage,
    isPostInDiscussion,
    isPostFinalized,
    isSending, // This is from useObjectDiscussion
  } = useObjectDiscussion({
    currentUserId: currentUserId || "",
    messages,
    sendMessage, // Pass the sendMessage from useMessageActions
    queryClient, // Pass queryClient
    setShowPosts, // Pass setShowPosts from useChatUI
  });

  // --- Effects from Chat.tsx ---
  const hasUnreadMessages = useMemo(() => {
    if (!conversationId || !chats) return false;
    const currentChat = chats.find((chat) => chat._id === conversationId);
    return !!currentChat && currentChat.unreadCount > 0;
  }, [conversationId, chats]);

  useEffect(() => {
    if (conversationId && hasUnreadMessages) {
      markAsRead(conversationId).catch((error) => {
        console.error("Failed to mark messages as read:", error);
      });
    }
  }, [conversationId, hasUnreadMessages, markAsRead]);

  // Note: Effect for marking individual messages read via socket might need adjustment
  // or stay in Chat.tsx if it relies on refs. For now, keep it simple.

  // --- Populate Context Value ---
  const value: ChatContextType = {
    // useInitializeChat
    currentUserId,
    otherUser,
    conversationId,
    isInitializing,
    error,
    // useChatData
    messages,
    userPosts,
    isLoadingPosts,
    isTyping,
    hasNextPage,
    fetchNextPage, // Pass the actual function from the hook
    isFetchingNextPage,
    // useChatUI (partial)
    inputMessage,
    showPosts,
    showMyPosts,
    myPosts,
    isLoadingMyPosts,
    setShowMyPosts,
    setShowPosts,
    handleMessageInput,
    handleTogglePosts, // Add handleTogglePosts to value
    // useMessageActions
    sendMessage,
    deleteMessages,
    isSendingMessage,
    // useObjectDiscussion
    selectedPost,
    editingContent,
    setSelectedPost,
    setEditingContent,
    handleDiscussionSubmit,
    handleConfirmAgreement,
    handleCancelDiscussion,
    // Simplified signatures for context - implementation remains in hook
    isCurrentUserSeller: (postId: string) =>
      isCurrentUserSeller(postId, myPosts, userPosts),
    isPostCompleted: (postId: string) => isPostCompleted(postId, messages),
    isLastDiscussionMessage: (message: ChatMessage) =>
      isLastDiscussionMessage(message, messages),
    isPostInDiscussion,
    isPostFinalized: (postId: string, discussingId: string) =>
      isPostFinalized(postId, discussingId, messages),
    isSending,
    handleSubmit, // Add handleSubmit to value
    // useChatHistory function
    markAsRead, // Add markAsRead to value
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Create a custom hook to use the ChatContext
export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};
