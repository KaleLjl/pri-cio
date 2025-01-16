import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useEffect, useCallback, useRef } from 'react';
import { socketService } from '@/lib/socket';
import { ChatMessage } from '@/lib/types/chat';

interface ChatRecord {
  _id: string;
  participants: {
    _id: string;
    name: string;
    avatarUrl: string;
  }[];
  lastMessage?: {
    _id: string;
    content: string;
    createdAt: string;
    senderId: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UseChatHistoryReturn {
  chats: ChatRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const chatCacheRef = useRef<Map<string, ChatRecord>>(new Map());

  // 处理新消息更新
  const handleNewMessage = useCallback((message: ChatMessage) => {
    console.log('Received new message in chat history:', message);
    
    // 立即强制刷新数据
    queryClient.invalidateQueries({ queryKey: ['chat-history'] });

    // 同时更新缓存
    queryClient.setQueriesData(
      { queryKey: ['chat-history'] },
      (oldData: ChatRecord[] | undefined) => {
        if (!oldData) return oldData;

        // 创建新数组以确保引用变化
        const currentChats = [...oldData];
        const chatIndex = currentChats.findIndex(
          chat => chat._id === message.conversationId
        );

        if (chatIndex !== -1) {
          // 创建新对象以确保引用变化
          currentChats[chatIndex] = {
            ...currentChats[chatIndex],
            lastMessage: {
              _id: message._id,
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId
            },
            updatedAt: message.createdAt
          };
        }

        // 返回新数组并重新排序
        return currentChats.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
    );
  }, [queryClient]);

  // 设置socket事件监听
  useEffect(() => {
    if (!session?.user?.id) return;

    console.log('Setting up socket connection in useChatHistory');
    socketService.connect(session.user.id);

    console.log('Setting up message handler in useChatHistory');
    const messageHandler = (message: ChatMessage) => {
      console.log('New message received in useChatHistory:', message);
      handleNewMessage(message);
    };

    socketService.onNewMessage(messageHandler);

    return () => {
      socketService.removeEventListener('new-message', messageHandler);
    };
  }, [session?.user?.id, handleNewMessage]);

  // 使用React Query获取和维护数据
  const {
    data: chats = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['chat-history'],
    queryFn: async () => {
      console.log('Fetching chat history...');
      const response = await fetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      const data = await response.json();
      console.log('Fetched chat history:', data);
      
      // 更新缓存引用
      chatCacheRef.current = new Map(
        (data as ChatRecord[]).map(chat => [chat._id, chat])
      );
      
      // 返回排序后的数据
      return Array.from(chatCacheRef.current.values()).sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || a.updatedAt;
        const timeB = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
    },
    staleTime: 0, // 修改为0，允许立即重新获取
    gcTime: 1000 * 60 * 5, // 5分钟后进行垃圾回收
    refetchOnWindowFocus: true, // 允许窗口聚焦时重新获取
    refetchOnMount: true, // 允许组件挂载时重新获取
    refetchOnReconnect: true, // 允许重新连接时重新获取
    enabled: !!session,
  });

  return {
    chats,
    loading,
    error: error as Error | null,
    refetch: async () => {
      console.log('Manual refetch triggered');
      await refetch();
    }
  };
} 