'use client'
import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider, useSession } from 'next-auth/react'
import { socketService } from '@/lib/socket'

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
  };
  updatedAt: string;
}

function SocketInitializer() {
  const { data: session } = useSession()

  useEffect(() => {
    const initializeSocketAndRooms = async () => {
      try {
        // 获取用户信息
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const userData = await response.json();
          
          // 连接socket
          if (!socketService.isConnected()) {
            console.log('Connecting socket with user ID:', userData._id);
            socketService.connect(userData._id);
          }

          // 获取所有聊天记录并加入房间
          const chatsResponse = await fetch('/api/chat/conversations');
          if (chatsResponse.ok) {
            const chats = await chatsResponse.json() as ChatRecord[];
            console.log('Joining all chat rooms in Provider');
            chats.forEach(chat => {
              socketService.joinRoom(chat._id);
            });
          }
        }
      } catch (error) {
        console.error('Error initializing socket and rooms:', error);
      }
    };

    if (session) {
      initializeSocketAndRooms();
    }

    return () => {
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [session]);

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