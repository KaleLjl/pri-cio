"use client";

import React, { createContext, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/context/CurrentUserContext";
import { socketService } from "@/lib/socket";
import { ChatMessage, ChatRecord } from "@/lib/types/chat";
// Removed SocketEventManager import
import { ChatCacheManager } from "@/lib/managers/ChatCacheManager";

// 创建 Context
interface SocketContextType {
  sendMessage: (message: ChatMessage) => void;
  sendTyping: (data: {
    conversationId: string;
    userId: string;
    typing: boolean;
  }) => void;
  // Removed sendMessageRead exposure
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  updateMessageStatus: (
    conversationId: string,
    messageId: string,
    status: "sending" | "sent" | "delivered" | "read" | "error",
    newMessage?: ChatMessage // Add optional 4th argument
  ) => void;
  markConversationAsRead: (conversationId: string) => void; // Expose this for UI interaction
  markMessageRead: (data: {
    messageId: string;
    conversationId: string;
  }) => void; // Expose the correct action
}

export const SocketContext = createContext<SocketContextType>(null!);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const listenerCleanupRefs = useRef<(() => void)[]>([]); // Ref to store cleanup functions

  // 初始化 managers
  // Removed socketManager initialization

  const cacheManager = useMemo(
    () => new ChatCacheManager(queryClient),
    [queryClient]
  );

  // Socket 连接管理 和 事件监听
  useEffect(() => {
    console.log("SocketProvider Connection Effect: Running...", {
      hasSession: !!session,
      hasCurrentUser: !!currentUser,
      currentUserId: currentUser?._id,
      isConnected: socketService.isConnected(),
    });

    if (session && currentUser?._id) {
      if (!socketService.isConnected()) {
        console.log(
          `SocketProvider Connection Effect: Conditions met (session, currentUser._id: ${currentUser._id}). Connecting...`
        );
        socketService.connect(currentUser._id);

        // Clear previous listeners before setting up new ones
        listenerCleanupRefs.current.forEach((cleanup) => cleanup());
        listenerCleanupRefs.current = [];

        console.log("SocketProvider: Setting up listeners...");
        // Directly use socketService and store cleanup functions
        const cleanupNewMessage = socketService.onNewMessage(
          async (message) => {
            console.log("SocketProvider: Received new message", message._id);
            const chats =
              queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
            if (!chats.some((chat) => chat._id === message.conversationId)) {
              console.log(
                "SocketProvider: Handling new conversation for message",
                message.conversationId
              );
              await cacheManager.handleNewConversation(message.conversationId);
            }
            // Pass currentUserId to handleNewMessage
            if (currentUser?._id) {
              cacheManager.handleNewMessage(message, currentUser._id);
            } else {
              console.error(
                "SocketProvider: Cannot handle new message, currentUser ID is missing."
              );
            }
          }
        );
        if (cleanupNewMessage)
          listenerCleanupRefs.current.push(cleanupNewMessage);

        const cleanupNewConv = socketService.onNewConversation(
          // Removed unused 'message' parameter
          async ({ conversationId }) => {
            console.log(
              "SocketProvider: Received new conversation event",
              conversationId
            );
            // Ensure the conversation list is updated before handling the message potentially
            await cacheManager.handleNewConversation(conversationId);
            // Optionally handle the first message if needed, though onNewMessage might cover it
            // cacheManager.handleNewMessage(message); // Removed unused parameter
          }
        );
        if (cleanupNewConv) listenerCleanupRefs.current.push(cleanupNewConv);

        // Removed onMessageDelivered listener

        const cleanupMsgRead = socketService.onMessageRead((messageId) => {
          console.log("SocketProvider: Received message read", messageId);
          // Need conversationId to update cache effectively
          // cacheManager.updateMessageStatus(messageId, "read"); // Needs conversationId
        });
        if (cleanupMsgRead) listenerCleanupRefs.current.push(cleanupMsgRead);

        const cleanupConvRead = socketService.onConversationRead(
          ({ conversationId }) => {
            console.log(
              "SocketProvider: Received conversation read",
              conversationId
            );
            cacheManager.markConversationAsRead(conversationId);
          }
        );
        if (cleanupConvRead) listenerCleanupRefs.current.push(cleanupConvRead);

        const cleanupUserTyping = socketService.onUserTyping(
          ({ userId, typing }) => {
            // console.log("SocketProvider: Received user typing", userId, typing); // Can be noisy
            cacheManager.updateTypingStatus(userId, typing);
          }
        );
        if (cleanupUserTyping)
          listenerCleanupRefs.current.push(cleanupUserTyping);
      } else {
        console.log(
          "SocketProvider Connection Effect: Conditions met, but already connected."
        );
      }
    } else {
      console.log(
        "SocketProvider Connection Effect: Conditions NOT met (session/currentUser._id missing). Checking if disconnect needed..."
      );
      // User logged out or session lost
      if (socketService.isConnected()) {
        console.log(
          "SocketProvider Connection Effect: Disconnecting socket due to no session/user."
        );
        listenerCleanupRefs.current.forEach((cleanup) => cleanup()); // Clean up listeners
        listenerCleanupRefs.current = [];
        socketService.disconnect();
      }
    }

    // Cleanup on component unmount or before re-running effect if dependencies change significantly
    return () => {
      console.log("SocketProvider: Cleanup effect running.");
      // Don't disconnect here if session/user might reappear, only on explicit logout/unmount
      // listenerCleanupRefs.current.forEach(cleanup => cleanup()); // Cleanup listeners on unmount
      // listenerCleanupRefs.current = [];
    };
  }, [session, currentUser, cacheManager, queryClient]); // Dependencies

  // 监听聊天列表变化并管理房间 (Keep this for chathistory real-time updates)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const joinedRooms = new Set<string>(); // Use const if only add/delete is used

    if (session && currentUser?._id && socketService.isConnected()) {
      const manageRooms = () => {
        const currentChats =
          queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
        const currentRoomIds = new Set(currentChats.map((chat) => chat._id));

        // Join new rooms
        currentRoomIds.forEach((roomId) => {
          if (!joinedRooms.has(roomId)) {
            console.log(
              "SocketProvider: Joining room based on chat history:",
              roomId
            );
            socketService.joinRoom(roomId);
            joinedRooms.add(roomId);
          }
        });

        // Leave old rooms
        joinedRooms.forEach((roomId) => {
          if (!currentRoomIds.has(roomId)) {
            console.log(
              "SocketProvider: Leaving room based on chat history:",
              roomId
            );
            socketService.leaveRoom(roomId);
            joinedRooms.delete(roomId);
          }
        });
      };

      // Initial room join
      manageRooms();

      // Subscribe to cache changes
      unsubscribe = queryClient.getQueryCache().subscribe(() => {
        manageRooms();
      });

      // Re-join rooms if socket reconnects
      const handleConnect = () => {
        console.log("SocketProvider: Re-joining rooms after reconnect.");
        joinedRooms.forEach((roomId) => socketService.joinRoom(roomId));
      };
      const cleanupConnect = socketService.onConnect(handleConnect);
      // Ensure cleanupConnect is a function before using it
      const finalCleanupConnect =
        typeof cleanupConnect === "function" ? cleanupConnect : () => {};

      return () => {
        console.log("SocketProvider: Cleaning up room management effect.");
        if (unsubscribe) unsubscribe();
        joinedRooms.forEach((roomId) => {
          console.log("SocketProvider: Leaving room on cleanup:", roomId);
          socketService.leaveRoom(roomId);
        });
        joinedRooms.clear();
        finalCleanupConnect(); // Call the potentially wrapped cleanup function
      };
    } else {
      // Ensure rooms are left if session ends or socket disconnects
      joinedRooms.forEach((roomId) => {
        console.log(
          "SocketProvider: Leaving room due to no session/user:",
          roomId
        );
        socketService.leaveRoom(roomId);
      });
      joinedRooms.clear();
    }
  }, [session, currentUser, queryClient]); // Rerun if session/user/client changes

  // 提供给子组件的方法
  const socketOperations = useMemo(
    () => ({
      sendMessage: (message: ChatMessage) => {
        if (!currentUser?._id) return; // Ensure user is logged in
        const messageToSend = {
          ...message,
          senderId: currentUser._id, // Ensure senderId is set
          status: message.status || "sending", // Ensure status is set
        };
        // Optimistic update - pass currentUserId
        cacheManager.handleNewMessage(messageToSend, currentUser._id);
        // Send via socket
        socketService.sendMessage(messageToSend);
      },
      sendTyping: (data: {
        conversationId: string;
        userId: string;
        typing: boolean;
      }) => {
        if (!currentUser?._id) return;
        // Ensure the typing event is for the current user
        socketService.sendTyping({ ...data, userId: currentUser._id });
      },
      // sendMessageRead removed - use markMessageRead instead
      joinRoom: (roomId: string) => {
        socketService.joinRoom(roomId); // Allow explicit joining if needed elsewhere
      },
      leaveRoom: (roomId: string) => {
        socketService.leaveRoom(roomId); // Allow explicit leaving
      },
      updateMessageStatus: (
        conversationId: string,
        messageId: string,
        status: "sending" | "sent" | "delivered" | "read" | "error",
        newMessage?: ChatMessage // Accept optional 4th argument
      ) => {
        // Pass all arguments to the cache manager
        cacheManager.updateMessageStatus(
          conversationId,
          messageId,
          status,
          newMessage
        );
      },
      markConversationAsRead: (conversationId: string) => {
        // Update cache optimistically
        cacheManager.markConversationAsRead(conversationId);
        // Optionally, could emit an event or call API if needed, but current server logic handles read via mark-read
      },
      markMessageRead: (data: {
        messageId: string;
        conversationId: string;
      }) => {
        // Update cache optimistically for the specific message
        cacheManager.updateMessageStatus(
          data.conversationId,
          data.messageId,
          "read"
        );
        // Send the actual event to the server
        socketService.markMessageRead(data);
      },
    }),
    [cacheManager, currentUser]
  ); // Added currentUser dependency

  return (
    <SocketContext.Provider value={socketOperations}>
      {children}
    </SocketContext.Provider>
  );
}
