// app/Providers.tsx (若使用App Router) 或 pages/_app.tsx (若使用Pages Router)
"use client";

import { useState, useEffect} from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";
import { CurrentUserProvider, useCurrentUser } from "@/lib/context/CurrentUserContext";
import { socketService } from "@/lib/socket";
import { ChatRecord } from "@/lib/types/chat";

/**
 * 这个组件只执行一次，用于全局初始化 Socket 及其事件监听。
 * 依赖：当前用户信息（如果登录）
 */
function GlobalSocketInitializer() {
  const { data: session } = useSession();
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    // 如果已登录，且有 currentUser，才初始化 Socket
    if (session && currentUser?._id) {
      if (!socketService.isConnected()) {
        console.log("SocketInitializer: Connecting socket with user ID:", currentUser._id);
        socketService.connect(currentUser._id);

        socketService.onConnect(() => {
          console.log("Socket connected, joining rooms");
          // 加入当前已经存在于缓存中的房间
          const chats = queryClient.getQueryData<ChatRecord[]>(["chat-history"]) || [];
          chats.forEach((chat) => {
            socketService.joinRoom(chat._id);
          });
        });
      }
    }

    return () => {
      // 组件卸载时不要断开连接，只在用户登出时断开
      if (!session && socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [session, currentUser, queryClient]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 分钟
            gcTime: 1000 * 60 * 10, // 10 分钟
          },
        },
      })
  );

  return (
    <SessionProvider>
      <CurrentUserProvider>
        <QueryClientProvider client={queryClient}>
          <GlobalSocketInitializer />
          {children}
        </QueryClientProvider>
      </CurrentUserProvider>
    </SessionProvider>
  );
}