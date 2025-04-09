"use client";

import React from "react";
import { ExploreItem } from "@/lib/types/explore";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { CURRENCIES } from "@/components/main/createpost/CreatePost";
import { getPrimaryImage } from "@/lib/utils/imageUtils";

interface MyPostsPopupProps {
  isLoading: boolean;
  posts: ExploreItem[];
  onPostSelect: (post: ExploreItem) => void;
  isPostInDiscussion: (postId: string) => boolean;
}

export default function MyPostsPopup({
  isLoading,
  posts,
  onPostSelect,
  isPostInDiscussion,
}: MyPostsPopupProps) {
  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800 z-30">
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No posts found</p>
        ) : (
          posts.map((post) => (
            <div
              key={post._id}
              className="flex items-start space-x-3 p-2 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-all relative"
              onClick={() => {
                if (isPostInDiscussion(post._id)) {
                  alert("This item is already in discussion.");
                  return;
                }
                onPostSelect(post);
              }}
            >
              {isPostInDiscussion(post._id) && (
                <div className="absolute top-2 right-2 z-10 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  In Discussion
                </div>
              )}
              <div className="relative w-16 h-16 flex-shrink-0">
                <ImageWithFallback
                  src={getPrimaryImage(post.images)}
                  alt={post.description}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {CURRENCIES.find((c) => c.value === post.currency)?.symbol}{" "}
                  {post.price}
                </p>
                <p className="text-xs text-gray-400 line-clamp-2">
                  {post.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
