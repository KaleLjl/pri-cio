"use client";

import React, { useEffect, useRef, useCallback } from "react"; // Import useEffect, useRef, useCallback
import MessageItem from "./MessageItem";
import { useChatContext } from "@/lib/context/ChatContext";

// Keep props interface for refs and scroll handler
interface MessageListProps {
  loadMoreRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

export default function MessageList({
  loadMoreRef,
  messagesEndRef,
  messagesContainerRef,
  handleScroll,
}: MessageListProps) {
  // Get values from context
  const {
    messages,
    currentUserId,
    isFetchingNextPage,
    markAsRead, // Get markAsRead function
    conversationId, // Get conversationId
    // userPosts,
    // handleConfirmAgreement,
    // handleCancelDiscussion,
    // isCurrentUserSeller,
    // isPostCompleted,
    // isLastDiscussionMessage,
    // isPostInDiscussion,
    // isPostFinalized,
    // isSending,
  } = useChatContext();

  const observer = useRef<IntersectionObserver | null>(null);
  const lastUnreadMessageRef = useRef<HTMLDivElement | null>(null); // Ref for the potential last unread message

  // Callback to handle intersection changes
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        // Check if the last unread message element is intersecting
        if (
          entry.isIntersecting &&
          entry.target === lastUnreadMessageRef.current &&
          conversationId
        ) {
          // console.log("Last unread message is visible, marking as read...");
          markAsRead(conversationId).catch(
            (
              err: unknown // Explicitly type err
            ) => console.error("Failed to mark as read on intersection:", err)
          );
          // Once marked read, disconnect the observer for this specific element
          if (observer.current && lastUnreadMessageRef.current) {
            observer.current.unobserve(lastUnreadMessageRef.current);
            lastUnreadMessageRef.current = null; // Clear the ref
          }
        }
      });
    },
    [markAsRead, conversationId]
  );

  // Effect to setup the observer
  useEffect(() => {
    observer.current = new IntersectionObserver(handleIntersection, {
      root: messagesContainerRef.current, // Observe within the scrollable container
      rootMargin: "0px",
      threshold: 0.5, // Trigger when 50% visible
    });

    // Cleanup function
    return () => {
      observer.current?.disconnect();
    };
  }, [handleIntersection, messagesContainerRef]); // Re-run if handler or container changes

  // Effect to observe the last unread message when messages change
  useEffect(() => {
    if (
      !observer.current ||
      !messages ||
      messages.length === 0 ||
      !currentUserId
    ) {
      return;
    }

    // Find the index of the last message sent by the *other* user
    let lastOtherUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId !== currentUserId) {
        lastOtherUserMessageIndex = i;
        break;
      }
    }

    // If found, try to observe the corresponding element
    if (lastOtherUserMessageIndex !== -1) {
      // We need a way to get the DOM node for this message.
      // We'll assign a ref conditionally in the map below.
      // If a previous last unread message was being observed, unobserve it first.
      if (lastUnreadMessageRef.current) {
        observer.current.unobserve(lastUnreadMessageRef.current);
        lastUnreadMessageRef.current = null;
      }
      // The actual observation happens via the ref callback in the map.
    }
  }, [messages, currentUserId]); // Re-run when messages or user ID change

  if (!currentUserId) {
    return null; // Or a loading/error state
  }

  // Find the index of the last message sent by the other user (needed for conditional ref)
  let lastOtherUserMessageIndex = -1;
  if (messages && currentUserId) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId !== currentUserId) {
        lastOtherUserMessageIndex = i;
        break;
      }
    }
  }

  return (
    <div
      ref={messagesContainerRef} // Use passed ref
      className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-gray-800"
      onScroll={handleScroll} // Use passed handler
    >
      {/* Load More Messages Indicator */}
      {isFetchingNextPage && ( // Use context value
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
        </div>
      )}
      <div ref={loadMoreRef} /> {/* Use passed ref */}
      {/* Messages List */}
      <div className="space-y-6">
        {messages.map((message, index) => {
          // Callback ref to potentially observe the last unread message
          const messageRefCallback = (node: HTMLDivElement | null) => {
            if (
              observer.current &&
              node &&
              index === lastOtherUserMessageIndex // Only observe the last message from the other user
            ) {
              // If we are already observing something else, unobserve it
              if (
                lastUnreadMessageRef.current &&
                lastUnreadMessageRef.current !== node
              ) {
                observer.current.unobserve(lastUnreadMessageRef.current);
              }
              // Observe the new node and update the ref
              observer.current.observe(node);
              lastUnreadMessageRef.current = node;
            } else if (
              observer.current &&
              node &&
              lastUnreadMessageRef.current === node &&
              index !== lastOtherUserMessageIndex // Unobserve if it's no longer the last message
            ) {
              observer.current.unobserve(node);
              lastUnreadMessageRef.current = null;
            }
          };

          return (
            <div
              key={message._id}
              ref={
                index === lastOtherUserMessageIndex ? messageRefCallback : null
              } // Attach ref conditionally
            >
              <MessageItem message={message} currentUserId={currentUserId} />
            </div>
          );
        })}
      </div>
      <div ref={messagesEndRef} /> {/* Use passed ref */}
    </div>
  );
}
