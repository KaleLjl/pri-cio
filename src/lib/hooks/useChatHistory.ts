import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRef } from 'react';
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