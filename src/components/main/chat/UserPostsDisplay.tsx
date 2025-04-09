"use client";

import { ExploreItem } from "@/lib/types/explore";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { CURRENCIES } from "@/components/main/createpost/CreatePost";
import { getPrimaryImage } from "@/lib/utils/imageUtils";

interface UserPostsDisplayProps {
  showPosts: boolean;
  isLoadingPosts: boolean;
  userPosts: ExploreItem[];
  onPostClick: (post: ExploreItem) => void;
  isPostInDiscussion: (postId: string) => boolean;
}

export default function UserPostsDisplay({
  showPosts,
  isLoadingPosts,
  userPosts,
  onPostClick,
  isPostInDiscussion,
}: UserPostsDisplayProps) {
  if (!showPosts || isLoadingPosts || userPosts.length === 0) {
    return null; // Don't render if hidden, loading, or no posts
  }

  return (
    <div className="bg-gray-800/70 backdrop-blur-sm p-4 rounded-b-lg shadow-lg border-t border-gray-700/50">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800">
        <div className="flex space-x-4 pb-2">
          {userPosts.map((post: ExploreItem) => (
            <div
              key={post._id}
              className="flex-none w-32 bg-gray-700/30 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all relative"
              onClick={() => {
                if (isPostInDiscussion(post._id)) {
                  alert("This item is already in discussion.");
                  return;
                }
                onPostClick(post);
              }}
            >
              {isPostInDiscussion(post._id) && (
                <div className="absolute top-2 right-2 z-10 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  In Discussion
                </div>
              )}
              <div className="relative w-32 h-32">
                <ImageWithFallback
                  src={getPrimaryImage(post.images)}
                  alt={post.description}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-2">
                <p className="text-sm font-medium truncate">
                  {CURRENCIES.find((c) => c.value === post.currency)?.symbol}{" "}
                  {post.price}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {post.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
