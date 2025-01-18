// components/ChatHistory.tsx
"use client";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { useChatHistory } from "@/lib/hooks/useChatHistory";
import { socketService } from "@/lib/socket";
import { useCurrentUser } from "@/lib/context/CurrentUserContext";
import { ChatRecord } from "@/lib/types/chat";

export default function ChatHistoryClient() {
  const { currentUser, loadingUser } = useCurrentUser();
  const { chats, loading, error } = useChatHistory();

  // 处理实时消息更新和房间管理
  useEffect(() => {
    if (!currentUser?._id || !chats?.length) return;

    // 只处理房间的加入和离开
    chats.forEach(chat => {
      socketService.joinRoom(chat._id);
    });

    // 清理函数
    return () => {
      chats.forEach(chat => {
        socketService.leaveRoom(chat._id);
      });
    };
  }, [currentUser?._id, chats]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy HH:mm");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // Loading states
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

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Chat History</h1>
      <div className="space-y-4">
        {chats.map((chat: ChatRecord) => {
          const otherParticipant = chat.participants.find(
            (p) => p._id !== currentUser._id
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
                <div className="relative w-12 h-12">
                  <div className="rounded-full overflow-hidden w-full h-full">
                    <Image
                      src={otherParticipant.avatarUrl || "/default-avatar.png"}
                      alt={otherParticipant.name}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white truncate">{otherParticipant.name}</h3>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 bg-purple-600 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-300'}`}>
                      {chat.lastMessage.content}
                    </p>
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