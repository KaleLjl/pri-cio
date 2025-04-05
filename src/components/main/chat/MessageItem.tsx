"use client";

import React from "react";
import { format } from "date-fns";
import { ChatMessage, ObjectDiscussionData } from "@/lib/types/chat";
import { ExploreItem } from "@/lib/types/explore";
import ObjectDiscussionCard from "./ObjectDiscussionCard"; // Will be created next

interface MessageItemProps {
  message: ChatMessage;
  currentUserId: string;
  allMessages: ChatMessage[]; // Needed for context in ObjectDiscussionCard
  // Props for ObjectDiscussionCard
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
  isPostCompleted: (postId: string) => boolean;
  isLastDiscussionMessage: (message: ChatMessage) => boolean;
  isPostInDiscussion: (postId: string) => boolean;
  isPostFinalized: (postId: string, discussingId: string) => boolean;
  isSending: boolean;
}

export default function MessageItem({
  message,
  currentUserId,
  allMessages,
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
}: MessageItemProps) {
  const isSender = message.senderId === currentUserId;

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[70%] space-y-1">
        {typeof message.content === "string" ? (
          // Render plain text message
          <div
            className={`rounded-lg px-4 py-2 break-words ${
              isSender ? "bg-purple-600 text-white" : "bg-gray-700 text-white"
            }`}
          >
            {message.content}
          </div>
        ) : message.content.type === "object_discussion" ? (
          // Render Object Discussion Card
          <ObjectDiscussionCard
            message={message} // Pass the whole message for context
            content={message.content as ObjectDiscussionData}
            myPosts={myPosts}
            userPosts={userPosts}
            currentUserId={currentUserId}
            handleDealComplete={handleDealComplete}
            handleCancelDiscussion={handleCancelDiscussion}
            isCurrentUserSeller={isCurrentUserSeller}
            isPostCompleted={isPostCompleted}
            isLastDiscussionMessage={isLastDiscussionMessage(message)}
            isPostInDiscussion={isPostInDiscussion}
            isPostFinalized={isPostFinalized}
            isSending={isSending}
            allMessages={allMessages} // Pass all messages for context
          />
        ) : null}

        {/* Timestamp and Status */}
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-xs text-gray-300">
            {format(new Date(message.createdAt), "HH:mm")}
          </span>
          {isSender && (
            <span className="text-xs text-gray-300">
              {message.status === "sending" && "Sending..."}
              {message.status === "sent" && "Sent"}
              {message.status === "delivered" && "Delivered"}
              {message.status === "read" && "Read"}
              {message.status === "error" && "Error"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
