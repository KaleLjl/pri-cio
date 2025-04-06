// components/ChatHistory.tsx
"use client";
import Link from "next/link";
import { format } from "date-fns";
import { useChatHistory } from "@/lib/hooks/useChatHistory";
import { useSession } from "next-auth/react";
import { useCurrentUser } from "@/lib/context/CurrentUserContext";
import { MessageContent } from "@/lib/types/chat";
import ImageWithFallback from "@/components/shared/ImageWithFallback";
import Loading from "@/components/shared/Loading";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export default function ChatHistoryClient() {
  const { status } = useSession();
  const { currentUser, loadingUser } = useCurrentUser();
  const { chats, loading, error, deleteMessages, markAsRead } =
    useChatHistory();
  const queryClient = useQueryClient();

  // Removed log for state on render

  // Add real-time update support
  useEffect(() => {
    // When component mounts, ensure chat history is up to date
    // queryClient.invalidateQueries({ queryKey: ["chat-history"] }); // Removed immediate invalidation on mount

    // Optional: refresh periodically to ensure sync
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["chat-history"] });
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy HH:mm");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // Format message content
  const formatMessageContent = (content: MessageContent): string => {
    if (typeof content === "string") {
      return content;
    }
    if (content.type === "object_discussion") {
      // Return more meaningful message preview
      return `[${content.description.slice(0, 20)}${
        content.description.length > 20 ? "..." : ""
      } - Price: ${content.suggestedPrice}]`;
    }
    return "";
  };

  // 1. Check session loading first
  if (status === "loading") {
    // Removed console.log
    return <Loading text="Authenticating..." />;
  }

  // 2. Check if unauthenticated
  if (status === "unauthenticated") {
    // Removed console.log
    return (
      <div className="text-center text-white">
        <p>Please sign in to view your chat history</p>
        <Link href="/signin" className="text-blue-400 hover:text-blue-300">
          Sign In
        </Link>
      </div>
    );
  }

  // 3. If authenticated, check context loading
  if (loadingUser) {
    // Removed console.log
    return <Loading text="Loading user data..." />;
  }

  // 4. If authenticated and context done loading, check if user data is actually available
  if (!currentUser) {
    // This now indicates a more serious issue if we reach here while authenticated
    // Keep the console.error for actual errors, but removed the extra log line
    console.error(
      "ChatHistory: User authenticated but currentUser context is null after loading."
    );
    return (
      <div className="text-red-500 p-4 text-center">
        Error: Failed to load user data. Please try again later.
      </div>
    );
  }

  // 5. Proceed with chat history specific loading/error/display logic
  // Removed console.log
  if (loading) {
    // loading from useChatHistory
    // Removed console.log
    return <Loading text="Loading chat history..." />;
  }

  if (error) {
    // error from useChatHistory
    // Keep console.error for actual errors
    console.error("ChatHistory: Error fetching chat history:", error);
    return (
      <div className="text-red-500 p-4 text-center">Error: {error.message}</div>
    );
  }

  if (!chats?.length) {
    // Removed console.log
    return (
      <div className="text-white text-center p-8">
        <p className="mb-4">Find people to chat with!</p>
        <Link
          href="/explore"
          className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-500 transition-colors"
        >
          Explore
        </Link>
      </div>
    );
  }

  // Removed console.log
  // ... (rest of the component rendering the chat list remains the same) ...
  return (
    // ... JSX for chat list ...
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Chat History</h1>
      <div className="space-y-4">
        {chats.map((chat) => {
          const otherParticipant = chat.participants.find(
            (p) => p._id !== currentUser._id
          );
          if (!otherParticipant) return null;

          const lastActivityTime =
            chat.lastMessage?.createdAt || chat.updatedAt;

          return (
            <Link
              key={chat._id}
              href={`/chat/${otherParticipant._id}`}
              onClick={() => {
                if (chat.unreadCount > 0) {
                  markAsRead(chat._id, chat.lastMessage?._id).catch((error) => {
                    console.error("Failed to mark messages as read:", error);
                  });
                }
              }}
              className="block p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12">
                  <div className="rounded-full overflow-hidden w-full h-full ring-2 ring-purple-500/30">
                    <ImageWithFallback
                      src={otherParticipant.avatarUrl || ""}
                      alt={otherParticipant.name}
                      fill
                      style={{ objectFit: "cover" }}
                      isAvatar={true}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {otherParticipant.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {chat.unreadCount > 0 && (
                        <span className="bg-purple-600 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {chat.unreadCount}
                        </span>
                      )}
                      <button
                        onClick={async (e) => {
                          e.preventDefault(); // Prevent link navigation
                          if (
                            window.confirm(
                              "Are you sure you want to delete this conversation?"
                            )
                          ) {
                            try {
                              await deleteMessages(chat._id);
                              // Clear this conversation's message cache
                              queryClient.removeQueries({
                                queryKey: ["chat-messages", chat._id],
                              });
                              alert("Conversation deleted successfully");
                            } catch (error) {
                              console.error(
                                "Failed to delete messages:",
                                error
                              );
                              alert(
                                error instanceof Error
                                  ? error.message
                                  : "Failed to delete conversation"
                              );
                            }
                          }
                        }}
                        className="p-1.5 hover:bg-red-600 rounded-lg transition-colors text-sm text-gray-400 hover:text-white"
                        title="Delete conversation"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
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
                  {chat.lastMessage && (
                    <p
                      className={`text-sm truncate ${
                        chat.unreadCount > 0
                          ? "text-white font-medium"
                          : "text-gray-300"
                      }`}
                    >
                      {formatMessageContent(chat.lastMessage.content)}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-400 text-xs">
                    {formatDate(lastActivityTime)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
