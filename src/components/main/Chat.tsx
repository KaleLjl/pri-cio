"use client";
import { useRouter } from "next/navigation";
// import { ChatProps } from "@/lib/types/chat"; // userId prop no longer needed
import Loading from "@/components/shared/Loading";
import ObjectDiscussion from "@/components/main/chat/ObjectDiscussion";
import { useChatUI } from "@/lib/hooks/chat"; // Keep useChatUI for refs/scroll
import { useChatContext } from "@/lib/context/ChatContext"; // Import the context hook
import ChatHeader from "./chat/ChatHeader";
import UserPostsDisplay from "./chat/UserPostsDisplay";
import MessageList from "./chat/MessageList";
import MessageInput from "./chat/MessageInput";

// Remove userId prop as it's handled by the Provider
export default function Chat() {
  const router = useRouter();

  // --- Use Context ---
  const {
    currentUserId,
    otherUser,
    conversationId,
    isInitializing,
    error,
    messages,
    // userPosts, // No longer needed directly here
    // isLoadingPosts, // REMOVED (unused)
    // isTyping, // REMOVED (unused)
    hasNextPage,
    fetchNextPage,
    // isFetchingNextPage, // No longer needed directly here
    // inputMessage, // No longer needed directly here
    // showPosts, // No longer needed directly here
    // showMyPosts, // No longer needed directly here
    // myPosts, // No longer needed directly here
    // isLoadingMyPosts, // No longer needed directly here
    // setShowMyPosts, // No longer needed directly here
    // handleMessageInput, // No longer needed directly here
    // deleteMessages, // No longer needed directly here
    // isSendingMessage, // No longer needed directly here
    // handleSubmit, // No longer needed directly here
    selectedPost,
    editingContent,
    setSelectedPost,
    setEditingContent,
    handleDiscussionSubmit,
    // handleConfirmAgreement, // No longer needed directly here
    // handleCancelDiscussion, // No longer needed directly here
    // isCurrentUserSeller, // No longer needed directly here
    // isPostCompleted, // No longer needed directly here
    // isLastDiscussionMessage, // No longer needed directly here
    // isPostInDiscussion, // No longer needed directly here
    // isPostFinalized, // No longer needed directly here
    // isSending, // No longer needed directly here
    handleTogglePosts,
  } = useChatContext();

  // --- Keep UI Hook ONLY for Refs/Scroll ---
  const { messagesEndRef, messagesContainerRef, loadMoreRef, handleScroll } =
    useChatUI({
      messages,
      currentUserId: currentUserId ? currentUserId : undefined, // Use ternary operator again
      conversationId,
      fetchNextPage,
      hasNextPage,
    });

  // --- Effects ---
  // Effects related to marking messages read were moved to ChatProvider

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
        {/* Chat Header - Props removed */}
        <ChatHeader
          onBackClick={() => router.push(`/chathistory`)} // Keep navigation handler
          onTogglePosts={handleTogglePosts} // Keep UI toggle handler
        />
        <div className="absolute top-36 left-0 right-0 z-10">
          {" "}
          {/* Adjust top based on header height */}
          <div className="container max-w-4xl mx-auto">
            <div className="mx-4">
              {/* User Posts Display - Props removed */}
              <UserPostsDisplay />
            </div>
          </div>
        </div>

        {/* Messages Container - Scrollable area */}
        <div className="absolute inset-0 pt-36 pb-6">
          {" "}
          {/* Adjust pt based on header height */}
          <div className="container max-w-4xl mx-auto h-full">
            <div className="h-full mx-4 bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg flex flex-col">
              {/* Messages Area - Props removed */}
              <MessageList
                loadMoreRef={loadMoreRef} // Keep ref
                messagesEndRef={messagesEndRef} // Keep ref
                messagesContainerRef={messagesContainerRef} // Keep ref
                handleScroll={handleScroll} // Keep scroll handler
              />

              {/* Object Discussion Modal */}
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
                  onSubmit={handleDiscussionSubmit} // Use context function
                />
              )}

              {/* Message Input - No props needed */}
              <MessageInput />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
