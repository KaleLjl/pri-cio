"use client";

// Removed useRouter as onBackClick is passed
import ImageWithFallback from "@/components/shared/ImageWithFallback";
// Removed UserProfile and ExploreItem imports as they come from context
import { useChatContext } from "@/lib/context/ChatContext"; // Import context hook

// Remove props interface
// interface ChatHeaderProps { ... }

// Remove props from function signature
export default function ChatHeader({
  onBackClick, // Keep navigation handler
  onTogglePosts, // Keep UI toggle handler
}: {
  onBackClick: () => void;
  onTogglePosts: () => void;
}) {
  // Get values from context
  const {
    otherUser,
    isTyping,
    isLoadingPosts,
    userPosts,
    showPosts,
    deleteMessages, // Get delete function from context
  } = useChatContext();

  // Handle potential null otherUser (though unlikely if Chat.tsx checks isInitializing)
  if (!otherUser) {
    return null; // Or a minimal loading/error state
  }

  return (
    <div className="absolute top-16 left-0 right-0 z-20">
      <div className="container max-w-4xl mx-auto">
        <div className="flex flex-col mx-4">
          {/* User Info */}
          <div className="flex items-center space-x-4 p-4 bg-gray-800/95 backdrop-blur-sm rounded-t-lg shadow-lg">
            <button
              onClick={onBackClick} // Use passed prop
              className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Back"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-500/50">
              <ImageWithFallback
                src={otherUser.avatarUrl || ""} // Use context value
                alt={otherUser.name || "User"} // Use context value
                width={48}
                height={48}
                className="object-cover rounded-full"
                isAvatar={true}
                priority
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{otherUser.name || "User"}</h1>
              {isTyping && (
                <p className="text-sm text-purple-400">Typing...</p>
              )}{" "}
              {/* Use context value */}
            </div>
            <div className="flex items-center space-x-2">
              {!isLoadingPosts &&
                userPosts.length > 0 && ( // Use context values
                  <button
                    onClick={onTogglePosts} // Use passed prop
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-sm text-white"
                    title={showPosts ? "Hide posts" : "Show posts"} // Use context value
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 transition-transform duration-200 ${
                        showPosts ? "rotate-180" : "" // Use context value
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                )}
              <button
                onClick={async () => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete all messages in this conversation?"
                    )
                  ) {
                    try {
                      await deleteMessages(); // Use context function
                      alert("Messages deleted successfully");
                      // Optionally navigate back after deletion
                      // onBackClick(); // Could call this if needed
                    } catch (error) {
                      console.error("Failed to delete messages:", error);
                      alert(
                        error instanceof Error
                          ? error.message
                          : "Failed to delete messages"
                      );
                    }
                  }
                }}
                className="p-2 hover:bg-red-600 rounded-lg transition-colors text-sm text-white"
                title="Delete conversation"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
