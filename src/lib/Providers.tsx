'use client'
import { useState, useEffect, useCallback } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { SessionProvider, useSession } from 'next-auth/react'
import { socketService } from '@/lib/socket'
import { ChatMessage } from '@/lib/types/chat'

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

function SocketInitializer() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const handleNewMessage = useCallback((message: ChatMessage) => {
    console.log('Received new message in provider:', message);
    
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

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          if (!socketService.isConnected()) {
            console.log('Connecting socket with user ID:', data._id);
            socketService.connect(data._id);

            // 设置消息处理器
            console.log('Setting up message handler in provider');
            socketService.onNewMessage((message: ChatMessage) => {
              console.log('New message received in provider:', message);
              handleNewMessage(message);
            });
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    if (session) {
      fetchCurrentUser();
    }

    return () => {
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [session, handleNewMessage]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5分钟
      },
    },
  }))

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SocketInitializer />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}