"use client";

import React from "react";
import { ExploreItem } from "@/lib/types/explore";
import MyPostsPopup from "./MyPostsPopup"; // Will be created next

interface MessageInputProps {
  inputMessage: string;
  isSendingMessage: boolean;
  showMyPosts: boolean;
  myPosts: ExploreItem[];
  isLoadingMyPosts: boolean;
  handleMessageInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  setShowMyPosts: (show: boolean) => void;
  setSelectedPost: (post: ExploreItem | null) => void; // For MyPostsPopup interaction
  isPostInDiscussion: (postId: string) => boolean; // For MyPostsPopup interaction
}

export default function MessageInput({
  inputMessage,
  isSendingMessage,
  showMyPosts,
  myPosts,
  isLoadingMyPosts,
  handleMessageInput,
  handleSubmit,
  setShowMyPosts,
  setSelectedPost,
  isPostInDiscussion,
}: MessageInputProps) {
  return (
    <div className="p-4 border-t border-gray-700/50">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1 flex gap-2">
          <button
            type="button"
            onClick={() => setShowMyPosts(!showMyPosts)}
            className="bg-gray-700/50 text-white px-3 rounded-lg hover:bg-gray-600/50 transition-all flex items-center"
            title={showMyPosts ? "Hide my posts" : "Show my posts to discuss"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={handleMessageInput}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700/50 backdrop-blur-sm text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all"
          />
          {showMyPosts && (
            <MyPostsPopup
              isLoading={isLoadingMyPosts}
              posts={myPosts}
              onPostSelect={(post: ExploreItem) => {
                setSelectedPost(post);
                setShowMyPosts(false); // Close popup after selection
              }}
              isPostInDiscussion={isPostInDiscussion}
            />
          )}
        </div>
        <button
          type="submit"
          disabled={!inputMessage.trim() || isSendingMessage}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
        >
          {isSendingMessage ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}
