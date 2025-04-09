"use client";

import React from "react";
import { ChatMessage, ObjectDiscussionData } from "@/lib/types/chat";
import { ExploreItem } from "@/lib/types/explore";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { CURRENCIES } from "@/components/main/createpost/CreatePost";

interface ObjectDiscussionCardProps {
  message: ChatMessage; // Pass the whole message for context if needed
  content: ObjectDiscussionData;
  myPosts: ExploreItem[];
  userPosts: ExploreItem[];
  currentUserId: string;
  allMessages: ChatMessage[]; // Needed for context checks
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
  isPostCompleted: (postId: string) => boolean; // This might need adjustment based on where the state lives
  isLastDiscussionMessage: boolean; // Simplified prop, calculated in MessageItem
  isPostInDiscussion: (postId: string) => boolean; // This might need adjustment
  isPostFinalized: (postId: string, discussingId: string) => boolean; // Simplified prop
  isSending: boolean;
}

export default function ObjectDiscussionCard({
  message,
  content,
  myPosts,
  userPosts,
  currentUserId,
  allMessages,
  handleDealComplete,
  handleCancelDiscussion,
  isCurrentUserSeller,
  isPostCompleted, // Consider if this check needs more context
  isLastDiscussionMessage,
  isPostInDiscussion, // Consider if this check needs more context
  isPostFinalized,
  isSending,
}: ObjectDiscussionCardProps) {
  const isSeller = isCurrentUserSeller(content.postId, myPosts, userPosts);
  const isFinalized = isPostFinalized(
    content.postId,
    content.discussingId || ""
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="relative">
        <div className="relative w-full h-48">
          <div className="absolute -top-2 -left-2 z-10">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                isSeller ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
              }`}
            >
              {isSeller ? "Seller" : "Buyer"}
            </span>
          </div>
          <ImageWithFallback
            src={content.imageUrl}
            alt={content.description}
            fill
            className={`object-cover rounded-lg ${
              isFinalized ? "grayscale" : ""
            } ${isSeller ? "ring-2 ring-blue-500" : "ring-2 ring-orange-500"}`}
          />
        </div>
        <div className="flex-1 min-w-0 mt-2">
          {" "}
          {/* Added mt-2 for spacing */}
          <p className="text-sm text-gray-300 line-clamp-2 mb-2">
            {content.description}
          </p>
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center text-gray-300">
              <span className="text-gray-400 w-20">Price:</span>
              <span
                className={`ml-1 truncate ${
                  isSeller ? "text-blue-400" : "text-orange-400"
                }`}
              >
                {CURRENCIES.find((c) => c.value === content.currency)?.symbol}
                {content.suggestedPrice}
              </span>
              {content.suggestedPrice !== content.originalPrice && (
                <span className="ml-2 text-xs text-gray-400 truncate">
                  (Original:{" "}
                  {CURRENCIES.find((c) => c.value === content.currency)?.symbol}
                  {content.originalPrice})
                </span>
              )}
            </p>
            <p className="flex items-center text-gray-300">
              <span className="text-gray-400 w-20">Location:</span>
              <span className="ml-1 truncate">{content.location}</span>
            </p>
            <p className="flex items-center text-gray-300">
              <span className="text-gray-400 w-20">Meeting Time:</span>
              <span className="ml-1 truncate">
                {new Date(content.meetingTime).toLocaleString()}
              </span>
            </p>
          </div>
          {/* Action Buttons */}
          {content.status === "discussing" && isLastDiscussionMessage && (
            <div className="mt-3 flex space-x-2">
              {/* Deal button - only visible to the receiver */}
              {message.senderId !== currentUserId && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDealComplete(content, message.senderId);
                  }}
                  disabled={isSending}
                  className={`px-3 py-1 text-sm text-white rounded-lg transition-colors ${
                    isSeller
                      ? "bg-blue-500 hover:bg-blue-400"
                      : "bg-orange-500 hover:bg-orange-400"
                  } ${isSending ? "opacity-50 cursor-wait" : ""}`}
                >
                  {isSending ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Complete"
                  )}
                </button>
              )}

              {/* Cancel button - visible to both parties */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelDiscussion(content, message.senderId);
                }}
                disabled={isSending}
                className={`px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-400 rounded-lg transition-colors ${
                  isSending ? "opacity-50 cursor-wait" : ""
                }`}
              >
                {isSending ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Cancel"
                )}
              </button>
            </div>
          )}
          {/* Status display */}
          {content.status !== "discussing" && (
            <div className="mt-2">
              <span
                className={`text-sm ${
                  content.status === "completed"
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {content.status === "completed" ? "Completed" : "Canceled"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
