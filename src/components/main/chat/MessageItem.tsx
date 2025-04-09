"use client";

import React from "react";
import { ChatMessage, ObjectDiscussionData } from "@/lib/types/chat";
// import { ExploreItem } from "@/lib/types/explore"; // REMOVED (unused)
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import ObjectDiscussionCard from "./ObjectDiscussionCard"; // Import the card component
import { useChatContext } from "@/lib/context/ChatContext"; // Import context hook

// Remove props interface, except for message
interface MessageItemProps {
  message: ChatMessage;
  // Keep currentUserId for direct comparison
  currentUserId: string;
}

// Remove props from function signature, except message
export default function MessageItem({
  message,
  currentUserId, // Keep for direct comparison
}: MessageItemProps) {
  // Get necessary values/functions from context
  const {
    // myPosts, // REMOVED (unused)
    // userPosts, // REMOVED (unused)
    // handleConfirmAgreement, // REMOVED (unused)
    // handleCancelDiscussion, // REMOVED (unused)
    // isCurrentUserSeller, // REMOVED (unused)
    // isPostCompleted, // REMOVED (unused)
    // isLastDiscussionMessage, // REMOVED (unused)
    // isPostInDiscussion, // REMOVED (unused)
    // isPostFinalized, // REMOVED (unused)
    // isSending, // REMOVED (unused)
    otherUser, // Needed for avatar
  } = useChatContext();

  const isSender = message.senderId === currentUserId;
  const alignment = isSender ? "justify-end" : "justify-start";
  const messageBg = isSender ? "bg-purple-600" : "bg-gray-700";
  const messageRounded = isSender ? "rounded-br-none" : "rounded-bl-none";

  // Determine if the content is ObjectDiscussionData
  const isObjectDiscussion =
    typeof message.content === "object" &&
    message.content !== null &&
    message.content.type === "object_discussion";

  return (
    <div className={`flex ${alignment} group`}>
      <div
        className={`flex items-end max-w-xs md:max-w-md lg:max-w-lg ${
          isSender ? "flex-row-reverse" : "flex-row"
        } gap-2`}
      >
        {/* Avatar (only for receiver messages) */}
        {!isSender && (
          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <ImageWithFallback
              src={otherUser?.avatarUrl || ""}
              alt={otherUser?.name || "User"}
              width={32}
              height={32}
              className="object-cover"
              isAvatar={true}
            />
          </div>
        )}

        {/* Message Content */}
        <div
          className={`px-4 py-3 rounded-2xl ${messageBg} ${messageRounded} text-white shadow-md`}
        >
          {isObjectDiscussion ? (
            <ObjectDiscussionCard
              message={message} // Pass the whole message
              content={message.content as ObjectDiscussionData}
              // Pass necessary props from context or calculated values
              // myPosts={myPosts} // REMOVED prop
              // userPosts={userPosts} // REMOVED prop
              // currentUserId={currentUserId} // REMOVED prop
              // allMessages={allMessages} // REMOVED prop
              // handleDealComplete={handleConfirmAgreement} // REMOVED prop
              // handleCancelDiscussion={handleCancelDiscussion} // REMOVED prop
              // isCurrentUserSeller={(postId: string) => isCurrentUserSeller(postId)} // REMOVED prop
              // isPostCompleted={(postId: string) => isPostCompleted(postId)} // REMOVED prop
              // isLastDiscussionMessage={isLastDiscussionMessage(message)} // REMOVED prop
              // isPostInDiscussion={(postId: string) => isPostInDiscussion(postId)} // REMOVED prop
              // isPostFinalized={(postId: string, discussingId: string) => isPostFinalized(postId, discussingId)} // REMOVED prop
              // isSending={isSending} // REMOVED prop
            />
          ) : (
            <p className="text-sm break-words">{message.content as string}</p> // Render plain text
          )}
        </div>

        {/* Message Status (only for sender messages) */}
        {isSender && (
          <div className="text-xs text-gray-500 self-end ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {message.status}
          </div>
        )}
      </div>
    </div>
  );
}
