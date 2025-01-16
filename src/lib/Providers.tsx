'use client'
import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider, useSession } from 'next-auth/react'
import { socketService } from '@/lib/socket'

function SocketInitializer() {
  const { data: session } = useSession()

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          if (!socketService.isConnected()) {
            console.log('Connecting socket with user ID:', data._id);
            socketService.connect(data._id);
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