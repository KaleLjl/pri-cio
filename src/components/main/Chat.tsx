"use client";
import { useRouter } from "next/navigation";
import { ChatProps } from "@/lib/types/chat";
import Loading from "@/components/shared/Loading";
import { useQueryClient } from "@tanstack/react-query";
import ObjectDiscussion from "@/components/shared/ObjectDiscussion";
import {
  useInitializeChat,
  useChatData,
  useMessageActions,
  useChatUI,
  useObjectDiscussion,
} from "@/lib/hooks/chat";
import { useChatHistory } from "@/lib/hooks/useChatHistory";
import { useEffect, useMemo, useContext, useRef } from "react"; // Import useContext, useRef
import { SocketContext } from "@/lib/context/SocketContext"; // Import SocketContext
import ChatHeader from "./chat/ChatHeader";
import UserPostsDisplay from "./chat/UserPostsDisplay";
import MessageList from "./chat/MessageList";
import MessageInput from "./chat/MessageInput";

export default function Chat({ userId }: ChatProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Get markAsRead for initial conversation read marking, chats for unread check
  const { markAsRead, chats } = useChatHistory();
  const socket = useContext(SocketContext); // Get socket context for marking individual messages

  // --- Hooks ---
  // Use the initialization hook
  const { currentUserId, otherUser, conversationId, isInitializing, error } =
    useInitializeChat({ userId });

  // Use the chat data hook
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

  // Use the chat UI hook
  const {
    messagesEndRef,
    messagesContainerRef,
    loadMoreRef,
    inputMessage,
    showPosts,
    showMyPosts,
    myPosts,
    isLoadingMyPosts,
    setShowMyPosts,
    setShowPosts,
    handleScroll,
    handleTogglePosts,
    // handlePostClick is now managed within UserPostsDisplay/MyPostsPopup -> setSelectedPost
    handleMessageInput,
    handleMessageSubmit, // This is passed to useMessageActions
  } = useChatUI({
    messages,
    currentUserId: currentUserId ?? undefined, // Pass currentUserId
    conversationId, // Pass conversationId
    fetchNextPage,
    hasNextPage,
  });

  // Use the message actions hook
  const {
    sendMessage, // Keep sendMessage for useObjectDiscussion
    deleteMessages, // Keep deleteMessages for ChatHeader
    handleSubmit, // Keep handleSubmit for MessageInput form
    isSending: isSendingMessage, // Keep isSendingMessage for MessageInput button state
    // isDeleting is likely handled internally now or not exposed
  } = useMessageActions({
    conversationId,
    currentUserId: currentUserId ?? undefined,
    otherUserId: otherUser?._id ?? undefined,
    handleMessageSubmit, // Pass the callback from useChatUI
  });

  // Use the object discussion hook
  const {
    selectedPost,
    editingContent,
    setSelectedPost, // Keep setSelectedPost for MessageInput/UserPostsDisplay interaction
    handleDiscussionSubmit, // Keep handleDiscussionSubmit for ObjectDiscussion modal
    // handleObjectDiscussionClick is likely internal to the hook now
    handleDealComplete, // Keep handleDealComplete for MessageList -> MessageItem -> ObjectDiscussionCard
    handleCancelDiscussion, // Keep handleCancelDiscussion for MessageList -> MessageItem -> ObjectDiscussionCard
    isCurrentUserSeller, // Keep isCurrentUserSeller for MessageList -> MessageItem -> ObjectDiscussionCard
    isPostCompleted, // Keep isPostCompleted for MessageList -> MessageItem -> ObjectDiscussionCard
    isLastDiscussionMessage, // Keep isLastDiscussionMessage for MessageList -> MessageItem -> ObjectDiscussionCard
    setEditingContent, // Keep setEditingContent for ObjectDiscussion modal interaction
    isPostInDiscussion, // Keep isPostInDiscussion for MessageInput/UserPostsDisplay/MessageList
    isPostFinalized, // Keep isPostFinalized for MessageList -> MessageItem -> ObjectDiscussionCard
    isSending, // Keep isSending for button states in ObjectDiscussionCard
  } = useObjectDiscussion({
    currentUserId: currentUserId || "",
    messages, // Pass messages
    sendMessage, // Pass sendMessage
    queryClient, // Pass queryClient
    setShowPosts, // Pass setShowPosts
  });

  // --- Effects ---
  // Memoize the current chat's unread status to prevent unnecessary effect runs
  const hasUnreadMessages = useMemo(() => {
    if (!conversationId || !chats) return false;
    const currentChat = chats.find((chat) => chat._id === conversationId);
    return !!currentChat && currentChat.unreadCount > 0;
  }, [conversationId, chats]);

  // Mark the message as read only if there are unread messages
  useEffect(() => {
    // Only run if conversationId is valid and there are unread messages
    if (conversationId && hasUnreadMessages) {
      markAsRead(conversationId).catch((error) => {
        console.error("Failed to mark messages as read:", error);
      });
    }
    // Depend on conversationId and the memoized unread status
  }, [conversationId, hasUnreadMessages, markAsRead]);

  // Effect to mark incoming messages as read when chat is active
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    if (!conversationId || !currentUserId || !socket?.markMessageRead) {
      return;
    }

    // Check only new messages since the last render
    const newMessages = messages.slice(prevMessagesLengthRef.current);

    newMessages.forEach((msg) => {
      // If message is from the other user and not already marked 'read' (optional check)
      if (msg.senderId !== currentUserId && msg.status !== "read") {
        socket.markMessageRead({ messageId: msg._id, conversationId });
      }
    });

    // Update the ref for the next render
    prevMessagesLengthRef.current = messages.length;
  }, [messages, conversationId, currentUserId, socket?.markMessageRead]); // Depend on messages and context function

  // --- Render Logic ---
  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="max-w-md w-full space-y-4 text-center px-4">
          <div className="text-xl text-red-500">{error}</div>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing || !otherUser) {
    return <Loading text="Loading chat..." />;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="absolute inset-0 flex flex-col">
        {/* Chat Header and User Posts Display */}
        <ChatHeader
          otherUser={otherUser}
          isTyping={isTyping}
          isLoadingPosts={isLoadingPosts}
          userPosts={userPosts}
          showPosts={showPosts}
          onBackClick={() => router.push(`/chathistory`)}
          onTogglePosts={handleTogglePosts}
          onDeleteConversation={deleteMessages}
        />
        <div className="absolute top-36 left-0 right-0 z-10">
          {" "}
          {/* Adjust top based on header height */}
          <div className="container max-w-4xl mx-auto">
            <div className="mx-4">
              <UserPostsDisplay
                showPosts={showPosts}
                isLoadingPosts={isLoadingPosts}
                userPosts={userPosts}
                onPostClick={(post) => {
                  // Removed handlePostClick, directly set selected post
                  setSelectedPost(post);
                }}
                isPostInDiscussion={isPostInDiscussion}
              />
            </div>
          </div>
        </div>

        {/* Messages Container - Scrollable area */}
        <div className="absolute inset-0 pt-36 pb-6">
          {" "}
          {/* Adjust pt based on header height */}
          <div className="container max-w-4xl mx-auto h-full">
            <div className="h-full mx-4 bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg flex flex-col">
              {/* Messages Area */}
              <MessageList
                messages={messages}
                currentUserId={currentUserId ?? undefined} // Fix: Ensure undefined instead of null
                isFetchingNextPage={isFetchingNextPage}
                loadMoreRef={loadMoreRef}
                messagesEndRef={messagesEndRef}
                messagesContainerRef={messagesContainerRef}
                handleScroll={handleScroll}
                myPosts={myPosts}
                userPosts={userPosts}
                handleDealComplete={handleDealComplete}
                handleCancelDiscussion={handleCancelDiscussion}
                isCurrentUserSeller={isCurrentUserSeller}
                isPostCompleted={(postId: string) =>
                  isPostCompleted(postId, messages)
                } // Fix: Adapt signature
                isLastDiscussionMessage={isLastDiscussionMessage}
                isPostInDiscussion={isPostInDiscussion}
                isPostFinalized={isPostFinalized}
                isSending={isSending}
              />

              {/* Object Discussion Modal (Remains the same) */}
              {(selectedPost || editingContent) && (
                <ObjectDiscussion
                  post={
                    selectedPost
                      ? {
                          ...selectedPost,
                          location: selectedPost.location
                            ? {
                                city: selectedPost.location.city || "",
                                country: selectedPost.location.country || "",
                              }
                            : undefined,
                        }
                      : {
                          _id: editingContent!.postId,
                          images: editingContent!.images || [],
                          description: editingContent!.description,
                          price: editingContent!.originalPrice,
                          currency: editingContent!.currency,
                          historyId: editingContent!.historyId,
                          location: editingContent!.location
                            ? {
                                city: editingContent!.location
                                  .split(",")[0]
                                  .trim(),
                                country: editingContent!.location
                                  .split(",")[1]
                                  .trim(),
                              }
                            : undefined,
                        }
                  }
                  initialValues={
                    editingContent
                      ? {
                          price: editingContent.suggestedPrice,
                          location: editingContent.location,
                          meetingTime: editingContent.meetingTime,
                        }
                      : undefined
                  }
                  onClose={() => {
                    setSelectedPost(null);
                    setEditingContent(null);
                  }}
                  onSubmit={handleDiscussionSubmit}
                />
              )}

              {/* Message Input */}
              <MessageInput
                inputMessage={inputMessage}
                isSendingMessage={isSendingMessage}
                showMyPosts={showMyPosts}
                myPosts={myPosts}
                isLoadingMyPosts={isLoadingMyPosts}
                handleMessageInput={handleMessageInput}
                handleSubmit={handleSubmit}
                setShowMyPosts={setShowMyPosts}
                setSelectedPost={setSelectedPost}
                isPostInDiscussion={isPostInDiscussion}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
