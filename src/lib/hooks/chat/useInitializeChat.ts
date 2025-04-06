import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatUser, ChatHistoryRecord } from "@/lib/types/chat"; // Import ChatHistoryRecord
import { useQueryClient } from "@tanstack/react-query";

interface UseInitializeChatProps {
  userId: string;
}

interface UseInitializeChatResult {
  currentUserId: string | null;
  otherUser: ChatUser | null;
  conversationId: string;
  isInitializing: boolean;
  error: string | null;
}

export function useInitializeChat({
  userId,
}: UseInitializeChatProps): UseInitializeChatResult {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Authentication check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (status !== "authenticated" || !userId || hasInitialized.current) {
        return;
      }

      try {
        setIsInitializing(true);
        setError(null);
        hasInitialized.current = true;

        // Create or get conversation
        const response = await fetch("/api/chat/conversations/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch chat data");
        }

        const data = await response.json();

        // Set conversation data
        setConversationId(data._id);

        // Find and set current user and other user from participants using IDs
        const sessionUserId = session?.user?.id; // Get current user's ID from session
        if (!sessionUserId) {
          throw new Error(
            "Session user ID not found during chat initialization."
          );
        }

        const currentUserData = data.participants.find(
          (p: ChatUser) => p._id === sessionUserId
        );
        // The other user's ID is the `userId` prop passed into the hook
        const otherUserData = data.participants.find(
          (p: ChatUser) => p._id === userId
        );

        if (currentUserData) {
          setCurrentUserId(currentUserData._id); // Set the state for current user ID
        } else {
          console.warn(
            "Current user data not found in participants array from initialize API"
          );
          // Optionally throw an error or handle appropriately
        }

        if (otherUserData) {
          setOtherUser(otherUserData); // Set the state for the other user
        } else {
          console.warn(
            "Other user data not found in participants array from initialize API"
          );
          // Optionally throw an error or handle appropriately
          // This could happen if the API returned incorrect participants
          throw new Error(
            "Other participant data not found in initialization response."
          );
        }

        // Update chat history cache
        queryClient.setQueryData(
          ["chat-history"],
          (oldChats: ChatHistoryRecord[] | undefined): ChatHistoryRecord[] => {
            const currentChats = oldChats || [];
            // Check if chat already exists
            const chatExists = currentChats.some(
              (chat) => chat._id === data._id
            );
            if (chatExists) {
              // Always return the current array state if no changes are needed
              return currentChats;
            }

            // Add new chat
            const newChat = {
              _id: data._id,
              participants: data.participants,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              unreadCount: 0, // Assuming unreadCount is part of ChatHistoryRecord or add if needed
            };

            return [newChat, ...currentChats];
          }
        );
      } catch (error) {
        console.error("Error initializing chat:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch chat data"
        );
        hasInitialized.current = false; // Reset if there was an error
      } finally {
        setIsInitializing(false);
      }
    };

    if (userId) {
      initializeChat();
    }
  }, [userId, status, session?.user?.name, queryClient]);

  return {
    currentUserId,
    otherUser,
    conversationId,
    isInitializing,
    error,
  };
}
