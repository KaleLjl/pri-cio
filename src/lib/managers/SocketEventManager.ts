import { socketService } from "@/lib/socket";
import { ChatMessage} from "@/lib/types/chat";

export class SocketEventManager {
  private static instance: SocketEventManager;

  private constructor() {}

  public static getInstance(): SocketEventManager {
    if (!this.instance) {
      this.instance = new SocketEventManager();
    }
    return this.instance;
  }

  // 事件监听初始化 - 返回事件而不是直接处理
  public initializeEventListeners(handlers: {
    onNewMessage: (message: ChatMessage) => void;
    onNewConversation: (data: { conversationId: string; message: ChatMessage }) => void;
    onMessageDelivered: (messageId: string) => void;
    onMessageRead: (messageId: string) => void;
    onConversationRead: (data: { conversationId: string }) => void;
    onUserTyping: (data: { userId: string; typing: boolean }) => void;
  }) {
    socketService.onNewMessage(handlers.onNewMessage);
    socketService.onNewConversation(handlers.onNewConversation);
    socketService.onMessageDelivered(handlers.onMessageDelivered);
    socketService.onMessageRead(handlers.onMessageRead);
    socketService.onConversationRead(handlers.onConversationRead);
    socketService.onUserTyping(handlers.onUserTyping);
  }

  // 发送方法
  public sendMessage(message: ChatMessage) {
    socketService.sendMessage(message);
  }

  public sendTyping(data: { conversationId: string; userId: string; typing: boolean }) {
    socketService.sendTyping(data);
  }

  public sendMessageDelivered(messageId: string) {
    socketService.sendMessageDelivered(messageId);
  }

  public sendMessageRead(messageId: string) {
    socketService.sendMessageRead(messageId);
  }

  public joinRoom(roomId: string) {
    socketService.joinRoom(roomId);
  }

  public leaveRoom(roomId: string) {
    socketService.leaveRoom(roomId);
  }
} 