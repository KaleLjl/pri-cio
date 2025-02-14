"use client";

import { createContext, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/context/CurrentUserContext";
import { socketService } from "@/lib/socket";
import { ChatMessage } from "@/lib/types/chat";
import { SocketEventManager } from "@/lib/managers/SocketEventManager";
import { ChatCacheManager } from "@/lib/managers/ChatCacheManager";
import { ChatRecord } from "@/lib/types/chat";

// 创建 Context
interface SocketContextType {
  sendMessage: (message: ChatMessage) => void;
  sendTyping: (data: { conversationId: string; userId: string; typing: boolean }) => void;
  sendMessageRead: (messageId: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  updateMessageStatus: (messageId: string, status: "sending" | "sent" | "delivered" | "read" | "error") => void;
}

export const SocketContext = createContext<SocketContextType>(null!);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  // 初始化 managers
  const socketManager = useMemo(() => 
    SocketEventManager.getInstance(),
    []
  );
  
  const cacheManager = useMemo(() => 
    new ChatCacheManager(queryClient),
    [queryClient]
  );

  // Socket 连接管理
  useEffect(() => {
    if (session && currentUser?._id) {
      if (!socketService.isConnected()) {
        socketService.connect(currentUser._id);
        
        // 初始化事件监听
        socketManager.initializeEventListeners({
          onNewMessage: async (message) => {
            // 检查是否是新对话的消息
            const chats = queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
            if (!chats.some(chat => chat._id === message.conversationId)) {
              // 如果是新对话，先等待处理新对话
              await cacheManager.handleNewConversation(message.conversationId);
            }
            // 然后再处理消息
            cacheManager.handleNewMessage(message);
          },
          onNewConversation: async ({ conversationId }) => {
            // 确保新对话被完全处理
            await cacheManager.handleNewConversation(conversationId);
          },
          onMessageDelivered: (messageId) => {
            cacheManager.updateMessageStatus(messageId, "delivered");
          },
          onMessageRead: (messageId) => {
            cacheManager.updateMessageStatus(messageId, "read");
          },
          onConversationRead: ({ conversationId }) => {
            cacheManager.markConversationAsRead(conversationId);
          },
          onUserTyping: ({ userId, typing }) => {
            cacheManager.updateTypingStatus(userId, typing);
          }
        });
      }
    }

    return () => {
      if (!session && socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [session, currentUser, socketManager, cacheManager, queryClient]);

  // 监听聊天列表变化并管理房间
  useEffect(() => {
    if (session && currentUser?._id) {
      // 获取当前的聊天列表
      const chats = queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
      
      // 加入所有聊天室
      chats.forEach(chat => {
        socketManager.joinRoom(chat._id);
      });

      // 设置查询缓存的监听器
      const unsubscribe = queryClient.getQueryCache().subscribe(() => {
        const currentChats = queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
        
        // 加入新的聊天室
        currentChats.forEach(chat => {
          socketManager.joinRoom(chat._id);
        });
      });

      return () => {
        // 清理：离开所有房间并取消订阅
        chats.forEach(chat => {
          socketManager.leaveRoom(chat._id);
        });
        unsubscribe();
      };
    }
  }, [session, currentUser, queryClient, socketManager]);

  // 提供给子组件的方法
  const socketOperations = useMemo(() => ({
    sendMessage: (message: ChatMessage) => {
      // 先更新本地缓存，显示发送中状态
      cacheManager.handleNewMessage({
        ...message,
        status: message.status || 'sending'  // 确保有状态
      });
      
      // 然后发送到服务器
      socketManager.sendMessage(message);
    },
    sendTyping: (data: { conversationId: string; userId: string; typing: boolean }) => {
      socketManager.sendTyping(data);
    },
    sendMessageRead: (messageId: string) => {
      socketManager.sendMessageRead(messageId);
    },
    joinRoom: (roomId: string) => {
      socketManager.joinRoom(roomId);
    },
    leaveRoom: (roomId: string) => {
      socketManager.leaveRoom(roomId);
    },
    updateMessageStatus: (messageId: string, status: "sending" | "sent" | "delivered" | "read" | "error") => {
      cacheManager.updateMessageStatus(messageId, status);
    }
  }), [socketManager, cacheManager]);

  return (
    <SocketContext.Provider value={socketOperations}>
      {children}
    </SocketContext.Provider>
  );
} 