"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/context/CurrentUserContext";
import { socketService } from "@/lib/socket";
import { ChatMessage, ChatRecord } from "@/lib/types/chat";

export function SocketProvider({ children }: { children: React.ReactNode }) {
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
            // 更新聊天历史缓存
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
                  unreadCount: isReceiver 
                    ? (updated[chatIndex].unreadCount || 0) + 1 
                    : updated[chatIndex].unreadCount || 0
                };
              }
              return updated.sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
            });

            // 更新具体对话的消息缓存
            queryClient.setQueryData<any>(
              ["chat-messages", message.conversationId],
              (old: any) => {
                if (!old) return {
                  pages: [{
                    messages: [message],
                    hasMore: false
                  }],
                  pageParams: [1]
                };

                const newPages = [...old.pages];
                const lastPage = newPages[newPages.length - 1];
                if (lastPage) {
                  lastPage.messages = [...lastPage.messages, message];
                }

                return {
                  ...old,
                  pages: newPages
                };
              }
            );
          });

          // 处理新对话
          socketService.onNewConversation(async ({ conversationId, message }) => {
            const currentChats = queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
            const conversationExists = currentChats.some(chat => chat._id === conversationId);
            
            if (!conversationExists) {
              try {
                const response = await fetch("/api/chat/conversations");
                if (!response.ok) {
                  throw new Error("Failed to fetch chat history");
                }
                const newChats = await response.json();
                queryClient.setQueryData(["chat-history"], newChats);
                socketService.joinRoom(conversationId);
              } catch (error) {
                console.error("Error fetching new chat history:", error);
              }
            }
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
            // 使用 React Query 管理 typing 状态
            queryClient.setQueryData(
              ["chat-typing-status", userId],
              typing
            );

            // 设置一个定时器，在一定时间后自动清除 typing 状态
            if (typing) {
              setTimeout(() => {
                queryClient.setQueryData(
                  ["chat-typing-status", userId],
                  false
                );
              }, 3000); // 3 seconds timeout
            }
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

    if (status === "read") {
      queryClient.setQueryData<ChatRecord[]>(["chat-history"], (oldChats) => {
        if (!oldChats) return oldChats;
        
        return oldChats.map(chat => {
          const hasMessage = chat.lastMessage && chat.lastMessage._id === messageId;
          if (hasMessage) {
            return {
              ...chat,
              unreadCount: 0
            };
          }
          return chat;
        });
      });
    }
  };

  return children;
} 