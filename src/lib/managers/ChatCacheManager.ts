import { QueryClient } from "@tanstack/react-query";
import { ChatMessage, ChatRecord } from "@/lib/types/chat";
import { InfiniteData } from "@tanstack/react-query";
import { MessagesResponse } from "@/lib/types/chat";

export class ChatCacheManager {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // 处理新消息
  public handleNewMessage(message: ChatMessage) {
    // 先获取现有缓存
    const existingData = this.queryClient.getQueryData<InfiniteData<MessagesResponse>>(
      ["chat-messages", message.conversationId]
    );

    // 更新缓存
    this.queryClient.setQueryData<InfiniteData<MessagesResponse>>(
      ["chat-messages", message.conversationId],
      (old) => {
        if (!old) {
          return {
            pages: [{
              messages: [message],
              hasMore: false
            }],
            pageParams: [undefined]
          };
        }

        // 检查消息是否已存在
        const messageExists = old.pages.some(page => 
          page.messages.some(msg => msg._id === message._id)
        );

        if (messageExists) {
          return old;
        }

        // 创建新的数据结构
        const newPages = old.pages.map((page, index) => ({
          ...page,
          messages: index === old.pages.length - 1 
            ? [...page.messages, message]
            : page.messages
        }));

        return {
          ...old,
          pages: newPages
        };
      }
    );

    // 强制通知更新，但不重新获取
    this.queryClient.invalidateQueries({
      queryKey: ["chat-messages", message.conversationId],
      exact: true,
      refetchType: "none"
    });

    // 更新聊天历史缓存
    this.queryClient.setQueryData<ChatRecord[]>(["chat-history"], (oldChats) => {
      if (!oldChats) return oldChats;
      
      const updated = [...oldChats];
      const chatIndex = updated.findIndex((chat) => chat._id === message.conversationId);

      if (chatIndex !== -1) {
        const lastMessage = {
          _id: message._id,
          content: message.content,
          createdAt: message.createdAt,
          senderId: message.senderId,
        };

        const isReceiver = message.receiverId === message.receiverId; // 判断当前用户是否是接收者
        const currentUnreadCount = updated[chatIndex].unreadCount || 0;

        updated[chatIndex] = {
          ...updated[chatIndex],
          lastMessage,
          updatedAt: message.createdAt,
          // 如果是接收者且消息状态不是'read'，则增加未读计数
          unreadCount: isReceiver && message.status !== 'read' 
            ? currentUnreadCount + 1 
            : currentUnreadCount
        };
      }
      return updated.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }

  // 处理新对话
  public async handleNewConversation(conversationId: string) {
    const currentChats = this.queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
    const conversationExists = currentChats.some(chat => chat._id === conversationId);
    
    if (!conversationExists) {
      try {
        const response = await fetch("/api/chat/conversations/list");
        if (!response.ok) {
          throw new Error(`Failed to fetch chat history: ${response.status}`);
        }
        const newChats = await response.json();
        
        if (Array.isArray(newChats)) {
          this.queryClient.setQueryData(["chat-history"], newChats);
        }
      } catch (error) {
        console.error("Error fetching new chat history:", error);
        this.queryClient.invalidateQueries({ queryKey: ["chat-history"] });
      }
    }
  }

  // 更新消息状态
  public updateMessageStatus(messageId: string, status: "sending" | "sent" | "delivered" | "read" | "error", newMessage?: ChatMessage) {
    this.queryClient.setQueriesData(
      { queryKey: ['chat-messages'] },
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) =>
              msg._id === messageId 
                ? { ...(newMessage || msg), status }
                : msg
            ),
          })),
        };
      }
    );

    if (status === "read") {
      this.queryClient.setQueryData<ChatRecord[]>(["chat-history"], (oldChats) => {
        if (!oldChats) return oldChats;
        
        return oldChats.map(chat => {
          const hasMessage = chat.lastMessage && chat.lastMessage._id === messageId;
          if (hasMessage) {
            return {
              ...chat,
              unreadCount: 0  // 清零未读计数
            };
          }
          return chat;
        });
      });
    }
  }

  // 标记对话为已读
  public markConversationAsRead(conversationId: string) {
    this.queryClient.setQueryData<ChatRecord[]>(["chat-history"], (oldChats) => {
      if (!oldChats) return oldChats;
      
      const updated = [...oldChats];
      const chatIndex = updated.findIndex((chat) => chat._id === conversationId);

      if (chatIndex !== -1) {
        updated[chatIndex] = {
          ...updated[chatIndex],
          unreadCount: 0  // 清零未读计数
        };
      }
      return updated;
    });
  }

  // 更新输入状态
  public updateTypingStatus(userId: string, typing: boolean) {
    this.queryClient.setQueryData(
      ["chat-typing-status", userId],
      typing
    );
  }

  // 添加新方法
  public handleOptimisticMessage(message: ChatMessage) {
    this.queryClient.setQueryData<InfiniteData<MessagesResponse>>(
      ['chat-messages', message.conversationId],
      (old) => {
        if (!old) {
          return {
            pages: [{
              messages: [message],
              hasMore: false
            }],
            pageParams: [undefined]
          };
        }

        return {
          ...old,
          pages: old.pages.map((page, index) => ({
            ...page,
            messages: index === old.pages.length - 1 
              ? [...page.messages, message]
              : page.messages
          }))
        };
      }
    );
  }
} 