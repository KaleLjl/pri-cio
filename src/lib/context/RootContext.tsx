"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SocketProvider } from "@/lib/context/SocketContext";
import { CurrentUserProvider } from "@/lib/context/CurrentUserContext";
import { createContext, useContext } from 'react';

interface RootContextProps {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

export function RootProvider({ children }: RootContextProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <CurrentUserProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </CurrentUserProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
} 