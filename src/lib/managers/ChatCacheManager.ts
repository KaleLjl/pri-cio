import { QueryClient } from "@tanstack/react-query";
import { ChatMessage, ChatRecord } from "@/lib/types/chat";
import { InfiniteData } from "@tanstack/react-query";
import { MessagesResponse } from "@/lib/types/chat";

export class ChatCacheManager {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // 处理新消息 - Added currentUserId parameter
  public async handleNewMessage(message: ChatMessage, currentUserId: string) {
    // 先获取现有缓存 - Removed unused variable 'existingData'
    // const existingData = this.queryClient.getQueryData<
    //   InfiniteData<MessagesResponse>
    // >(["chat-messages", message.conversationId]);

    // 更新消息缓存
    this.queryClient.setQueryData<InfiniteData<MessagesResponse>>(
      ["chat-messages", message.conversationId],
      (old) => {
        if (!old) {
          return {
            pages: [
              {
                messages: [message],
                hasMore: false,
              },
            ],
            pageParams: [undefined],
          };
        }

        // 检查消息是否已存在
        const messageExists = old.pages.some((page) =>
          page.messages.some((msg) => msg._id === message._id)
        );

        // If message exists (sender's own message confirmation), update its status to 'sent'
        if (messageExists) {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg._id === message._id
                  ? { ...msg, status: "sent", createdAt: message.createdAt } // Update status and potentially createdAt
                  : msg
              ),
            })),
          };
        }

        // Otherwise, it's a new message from the other user, add it to the last page
        return {
          ...old,
          pages: old.pages.map((page, index) => ({
            ...page,
            messages:
              index === old.pages.length - 1
                ? [...page.messages, message]
                : page.messages,
          })),
        };
      }
    );

    // 更新聊天历史缓存
    this.queryClient.setQueryData<ChatRecord[]>(
      ["chat-history"],
      (oldChats) => {
        if (!oldChats) return oldChats;

        const updated = [...oldChats];
        const chatIndex = updated.findIndex(
          (chat) => chat._id === message.conversationId
        );

        if (chatIndex !== -1) {
          const lastMessage = {
            _id: message._id,
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId,
          };

          // Correctly check if the current user is the receiver
          const isReceiver = message.receiverId === currentUserId;
          const currentUnreadCount = updated[chatIndex].unreadCount || 0;
          const isAlreadyRead = message.status === "read"; // Check if incoming message is already read

          updated[chatIndex] = {
            ...updated[chatIndex],
            lastMessage,
            updatedAt: message.createdAt,
            // Increment unread count only if the current user is the receiver AND the message isn't already marked as read
            unreadCount:
              isReceiver && !isAlreadyRead
                ? currentUnreadCount + 1
                : currentUnreadCount,
          };
        }
        return updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
    );

    // 强制通知更新，但不重新获取
    this.queryClient.invalidateQueries({
      queryKey: ["chat-messages", message.conversationId],
      exact: true,
      refetchType: "none",
    });
  }

  // 处理新对话
  public async handleNewConversation(conversationId: string): Promise<void> {
    const currentChats =
      this.queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
    const conversationExists = currentChats.some(
      (chat) => chat._id === conversationId
    );

    if (!conversationExists) {
      try {
        const response = await fetch("/api/chat/conversations/list");
        if (!response.ok) {
          throw new Error(`Failed to fetch chat history: ${response.status}`);
        }
        const newChats = await response.json();

        if (Array.isArray(newChats)) {
          // 等待缓存更新完成
          await this.queryClient.setQueryData(["chat-history"], newChats);

          // 确保新对话已经加入到缓存中
          const updatedChats =
            this.queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
          if (!updatedChats.some((chat) => chat._id === conversationId)) {
            // 如果仍然没有找到对话，强制刷新
            await this.queryClient.invalidateQueries({
              queryKey: ["chat-history"],
            });
          }
        }
      } catch (error) {
        console.error("Error fetching new chat history:", error);
        // 发生错误时强制刷新
        await this.queryClient.invalidateQueries({
          queryKey: ["chat-history"],
        });
      }
    }
  }

  // 更新消息状态 - Added conversationId parameter and improved types
  public updateMessageStatus(
    conversationId: string,
    messageId: string,
    status: "sending" | "sent" | "delivered" | "read" | "error",
    newMessage?: ChatMessage
  ) {
    this.queryClient.setQueryData<InfiniteData<MessagesResponse>>(
      ["chat-messages", conversationId], // Use specific query key
      (oldData): InfiniteData<MessagesResponse> | undefined => {
        if (!oldData) return undefined;

        const updatedData = {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) =>
              msg._id === messageId
                ? { ...(newMessage || msg), status: status } // Ensure status type matches
                : msg
            ),
          })),
        };
        return updatedData;
      }
    );

    if (status === "read") {
      this.queryClient.setQueryData<ChatRecord[]>(
        ["chat-history"],
        (oldChats) => {
          if (!oldChats) return oldChats;

          // When a message is marked read, reset the unread count for that specific conversation.
          return oldChats.map((chat) => {
            if (chat._id === conversationId) {
              // Find the correct chat by conversationId
              return {
                ...chat,
                unreadCount: 0, // Unconditionally reset the count
              };
            }
            return chat; // Return other chats unchanged
          });
        }
      );
    }
  }

  // 标记对话为已读
  public markConversationAsRead(conversationId: string) {
    this.queryClient.setQueryData<ChatRecord[]>(
      ["chat-history"],
      (oldChats) => {
        if (!oldChats) return oldChats;

        const updated = [...oldChats];
        const chatIndex = updated.findIndex(
          (chat) => chat._id === conversationId
        );

        if (chatIndex !== -1) {
          updated[chatIndex] = {
            ...updated[chatIndex],
            unreadCount: 0, // 清零未读计数
          };
        }
        return updated;
      }
    );
  }

  // 更新输入状态
  public updateTypingStatus(userId: string, typing: boolean) {
    this.queryClient.setQueryData(["chat-typing-status", userId], typing);
  }

  // Removed handleOptimisticMessage method (duplicate logic)
}
