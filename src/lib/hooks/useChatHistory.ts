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
    
    // 立即更新React Query缓存
    queryClient.setQueriesData({ queryKey: ['chat-history'] }, (oldData: ChatRecord[] | undefined) => {
      if (!oldData) return oldData;

      const currentChats = new Map(oldData.map(chat => [chat._id, chat]));
      
      // 更新或添加新消息到缓存
      if (currentChats.has(message.conversationId)) {
        const chat = currentChats.get(message.conversationId)!;
        currentChats.set(message.conversationId, {
          ...chat,
          lastMessage: {
            _id: message._id,
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId
          },
          updatedAt: message.createdAt
        });
      } else {
        // 如果是新对话，触发重新获取
        queryClient.invalidateQueries({ queryKey: ['chat-history'] });
        return oldData;
      }

      // 转换回数组并排序
      const updatedChats = Array.from(currentChats.values());
      return updatedChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  }, [queryClient]);

  // 设置socket事件监听
  useEffect(() => {
    if (!session?.user?.id) return;

    console.log('Setting up message handler in useChatHistory');
    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.removeEventListener('new-message', handleNewMessage);
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
    staleTime: Infinity, // 永不过期，由socket更新触发刷新
    gcTime: Infinity, // 永久缓存
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
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