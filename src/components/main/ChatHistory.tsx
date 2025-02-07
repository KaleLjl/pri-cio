// components/ChatHistory.tsx
"use client";
import { useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useChatHistory } from "@/lib/hooks/useChatHistory";
import { socketService } from "@/lib/socket";
import { useCurrentUser } from "@/lib/context/CurrentUserContext";
import {  MessageContent } from "@/lib/types/chat";
import { useLanguage } from '@/lib/context/LanguageContext';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import Loading from '@/components/shared/Loading';
import { useQueryClient } from '@tanstack/react-query';

export default function ChatHistoryClient() {
  const { dict } = useLanguage();
  const { currentUser, loadingUser } = useCurrentUser();
  const { chats, loading, error, deleteMessages } = useChatHistory();
  const queryClient = useQueryClient();

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

  // 格式化消息内容
  const formatMessageContent = (content: MessageContent): string => {
    if (typeof content === 'string') {
      return content;
    }
    if (content.type === 'object_discussion') {
      // 返回更有意义的消息预览
      return `[${content.description.slice(0, 20)}${content.description.length > 20 ? '...' : ''} - ${dict.objectDiscussion.price}: ${content.suggestedPrice}]`;
    }
    return '';
  };

  // Loading states
  if (loadingUser) {
    return <Loading text={dict.chatHistory.loading} />;
  }

  if (!currentUser) {
    return (
      <div className="text-center text-white">
        <p>{dict.chatHistory.signIn.message}</p>
        <Link href="/signin" className="text-blue-400 hover:text-blue-300">
          {dict.chatHistory.signIn.action}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <Loading text={dict.chatHistory.loading} />;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        {dict.chatHistory.error}: {error.message}
      </div>
    );
  }

  if (!chats?.length) {
    return (
      <div className="text-white text-center p-8">
        <p className="mb-4">{dict.chatHistory.findPeople.message}</p>
        <Link
          href="/explore"
          className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-500 transition-colors"
        >
          {dict.chatHistory.findPeople.action}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">{dict.chatHistory.title}</h1>
      <div className="space-y-4">
        {chats.map(chat => {
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
                  <div className="rounded-full overflow-hidden w-full h-full ring-2 ring-purple-500/30">
                    <ImageWithFallback
                      src={otherParticipant.avatarUrl || ''}
                      alt={otherParticipant.name}
                      fill
                      style={{ objectFit: "cover" }}
                      isAvatar={true}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white truncate">{otherParticipant.name}</h3>
                    <div className="flex items-center gap-2">
                      {chat.unreadCount > 0 && (
                        <span className="bg-purple-600 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {chat.unreadCount}
                        </span>
                      )}
                      <button
                        onClick={async (e) => {
                          e.preventDefault(); // 阻止链接跳转
                          if (window.confirm(dict.chatHistory.deleteConfirm.message)) {
                            try {
                              await deleteMessages(chat._id);
                              // 清除该对话的消息缓存
                              queryClient.removeQueries({ queryKey: ["chat-messages", chat._id] });
                              alert(dict.chatHistory.toast.deleteSuccess);
                            } catch (error) {
                              console.error("Failed to delete messages:", error);
                              alert(dict.chatHistory.toast.deleteError);
                            }
                          }
                        }}
                        className="p-1.5 hover:bg-red-600 rounded-lg transition-colors text-sm text-gray-400 hover:text-white"
                        title={dict.chatHistory.deleteConfirm.title}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {chat.lastMessage && (
                    <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-300'}`}>
                      {formatMessageContent(chat.lastMessage.content)}
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