// app/Providers.tsx (若使用App Router) 或 pages/_app.tsx (若使用Pages Router)
"use client";

import { useState, useEffect} from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";
import { CurrentUserProvider, useCurrentUser } from "@/lib/context/CurrentUserContext";
import { socketService } from "@/lib/socket";
import { ChatMessage, ChatRecord } from "@/lib/types/chat";

/**
 * 这个组件只执行一次，用于全局初始化 Socket 及其事件监听。
 * 依赖：当前用户信息（如果登录）
 */
function GlobalSocketInitializer() {
  const { data: session } = useSession();
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (session && currentUser?._id) {
      if (!socketService.isConnected()) {
        socketService.connect(currentUser._id);
        
        // 只在首次连接时设置监听器
        const setupSocketListeners = () => {
          // 连接成功时加入房间
          socketService.onConnect(() => {
            const chats = queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
            chats.forEach((chat) => {
              socketService.joinRoom(chat._id);
            });
          });

          // 新消息处理
          socketService.onNewMessage((message: ChatMessage) => {
            queryClient.setQueryData<ChatRecord[]>(["chat-history"], (oldChats) => {
              if (!oldChats) return oldChats;
              
              const updated = [...oldChats];
              const chatIndex = updated.findIndex((chat) => chat._id === message.conversationId);

              if (chatIndex !== -1) {
                const isReceiver = message.receiverId === currentUser._id;
                updated[chatIndex] = {
                  ...updated[chatIndex],
                  lastMessage: {
                    _id: message._id,
                    content: message.content,
                    createdAt: message.createdAt,
                    senderId: message.senderId,
                  },
                  updatedAt: message.createdAt,
                  // 如果当前用户是接收者，增加未读消息计数
                  unreadCount: isReceiver 
                    ? (updated[chatIndex].unreadCount || 0) + 1 
                    : updated[chatIndex].unreadCount || 0
                };
              }
              return updated.sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
            });
          });

          // 消息状态更新处理
          socketService.onMessageDelivered((messageId: string) => {
            updateMessageStatus(messageId, "delivered");
          });

          socketService.onMessageRead((messageId: string) => {
            updateMessageStatus(messageId, "read");
          });

          // 处理会话已读状态
          socketService.onConversationRead(({ conversationId }) => {
            queryClient.setQueryData<ChatRecord[]>(["chat-history"], (oldChats) => {
              if (!oldChats) return oldChats;
              
              const updated = [...oldChats];
              const chatIndex = updated.findIndex((chat) => chat._id === conversationId);

              if (chatIndex !== -1) {
                updated[chatIndex] = {
                  ...updated[chatIndex],
                  unreadCount: 0
                };
              }
              return updated;
            });
          });

          // 用户输入状态处理
          socketService.onUserTyping(({ userId, typing }: { userId: string; typing: boolean }) => {
            queryClient.setQueryData<any>(
              ["chat-typing-status", userId],
              typing
            );
          });
        };

        setupSocketListeners();
      }
    }

    return () => {
      if (!session && socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [session, currentUser, queryClient]);

  // 辅助函数：更新消息状态
  const updateMessageStatus = (messageId: string, status: "delivered" | "read") => {
    queryClient.setQueriesData(
      { queryKey: ["chat-messages"] },
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) =>
              msg._id === messageId ? { ...msg, status } : msg
            ),
          })),
        };
      }
    );
  };

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 分钟
            gcTime: 1000 * 60 * 10, // 10 分钟
          },
        },
      })
  );

  return (
    <SessionProvider>
      <CurrentUserProvider>
        <QueryClientProvider client={queryClient}>
          <GlobalSocketInitializer />
          {children}
        </QueryClientProvider>
      </CurrentUserProvider>
    </SessionProvider>
  );
}