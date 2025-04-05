"use client";

import React from "react";
import { ChatMessage, ObjectDiscussionData } from "@/lib/types/chat";
import { ExploreItem } from "@/lib/types/explore"; // Needed for MessageItem props
import MessageItem from "./MessageItem"; // Will be created next

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string | undefined;
  isFetchingNextPage: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  // Props needed for MessageItem -> ObjectDiscussionCard
  myPosts: ExploreItem[];
  userPosts: ExploreItem[];
  handleDealComplete: (content: ObjectDiscussionData, senderId: string) => void;
  handleCancelDiscussion: (
    content: ObjectDiscussionData,
    senderId: string
  ) => void;
  isCurrentUserSeller: (
    postId: string,
    myPosts: ExploreItem[],
    userPosts: ExploreItem[]
  ) => boolean;
  isPostCompleted: (postId: string) => boolean; // Assuming this check is simpler now
  isLastDiscussionMessage: (
    message: ChatMessage,
    allMessages: ChatMessage[]
  ) => boolean;
  isPostInDiscussion: (postId: string) => boolean; // Needed for MessageItem
  isPostFinalized: (
    postId: string,
    discussingId: string,
    allMessages: ChatMessage[]
  ) => boolean;
  isSending: boolean; // For disabling buttons
}

export default function MessageList({
  messages,
  currentUserId,
  isFetchingNextPage,
  loadMoreRef,
  messagesEndRef,
  messagesContainerRef,
  handleScroll,
  myPosts,
  userPosts,
  handleDealComplete,
  handleCancelDiscussion,
  isCurrentUserSeller,
  isPostCompleted,
  isLastDiscussionMessage,
  isPostInDiscussion,
  isPostFinalized,
  isSending,
}: MessageListProps) {
  if (!currentUserId) {
    return null; // Or a loading/error state
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800"
      onScroll={handleScroll}
    >
      {/* Load More Messages Indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
        </div>
      )}
      <div ref={loadMoreRef} />

      {/* Messages List */}
      <div className="space-y-6">
        {messages.map((message) => (
          <MessageItem
            key={message._id}
            message={message}
            currentUserId={currentUserId}
            myPosts={myPosts}
            userPosts={userPosts}
            handleDealComplete={handleDealComplete}
            handleCancelDiscussion={handleCancelDiscussion}
            isCurrentUserSeller={isCurrentUserSeller}
            isPostCompleted={isPostCompleted}
            isLastDiscussionMessage={(msg: ChatMessage) =>
              isLastDiscussionMessage(msg, messages)
            } // Pass messages context
            isPostInDiscussion={isPostInDiscussion}
            isPostFinalized={(postId: string, discussingId: string) =>
              isPostFinalized(postId, discussingId || "", messages)
            } // Pass messages context
            isSending={isSending}
            allMessages={messages} // Pass all messages for context if needed directly in MessageItem/ObjectDiscussionCard
          />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}
