// components/ChatHistory.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { useChatHistory } from "@/lib/hooks/useChatHistory";
import { socketService } from "@/lib/socket";
import { useCurrentUser } from "@/lib/context/CurrentUserContext";
import { ChatMessage } from "@/lib/types/chat";

interface ChatParticipant {
  _id: string;
  name: string;
  avatarUrl?: string;
}

interface Chat {
  _id: string;
  participants: ChatParticipant[];
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  updatedAt: string;
}

export default function ChatHistoryClient() {
  const { currentUser, loadingUser } = useCurrentUser();
  const { chats, loading, error, updateChatHistory } = useChatHistory();

  // 修改 socket 事件监听的设置
  useEffect(() => {
    if (!currentUser?._id) return;

    // 确保连接 socket
    if (!socketService.isConnected()) {
      socketService.connect(currentUser._id);
    }

    // 为所有聊天记录加入对应的房间
    chats?.forEach(chat => {
      socketService.joinRoom(chat._id);
    });

    const handleNewMessage = (message: ChatMessage) => {
      console.log("New message received in ChatHistory:", message);
      updateChatHistory(message);
    };

    // 设置消息监听
    socketService.onNewMessage(handleNewMessage);

    return () => {
      // 清理时只移除事件监听，不断开连接
      socketService.removeEventListener("new-message", handleNewMessage);
    };
  }, [currentUser, chats, updateChatHistory]);

  if (loadingUser) {
    return (
      <div className="text-white text-center p-8">
        <p>Loading user info...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center text-white">
        <p>Please sign in to view your chat history.</p>
        <Link href="/signin" className="text-blue-400 hover:text-blue-300">
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        Error loading chat history: {error.message}
      </div>
    );
  }

  if (!chats?.length) {
    return (
      <div className="text-white text-center p-8">
        <p className="mb-4">No chat history found.</p>
        <Link
          href="/explore"
          className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-500 transition-colors"
        >
          Find people to chat with
        </Link>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy HH:mm");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Chat History</h1>
      <div className="space-y-4">
        {chats.map((chat: Chat) => {
          const otherParticipant = chat.participants.find(
            (p: ChatParticipant) => p._id !== currentUser._id
          );
          if (!otherParticipant) return null;

          const lastActivityTime = chat.lastMessage?.createdAt || chat.updatedAt;

          return (
            <Link
              key={chat._id}
              href={`/chat/${otherParticipant._id}`}
              className="block p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={otherParticipant.avatarUrl || "/default-avatar.png"}
                    alt={otherParticipant.name}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">{otherParticipant.name}</h3>
                  {chat.lastMessage && (
                    <p className="text-gray-300 text-sm truncate">{chat.lastMessage.content}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-400 text-xs">{formatDate(lastActivityTime)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}