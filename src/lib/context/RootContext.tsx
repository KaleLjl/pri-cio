"use client";

import { SessionProvider } from "next-auth/react";
import { CurrentUserProvider } from "@/lib/context/CurrentUserContext";
import { QueryContext } from "@/lib/context/QueryContext";
import { SocketContext } from "@/lib/context/SocketContext";

export function RootContext({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrentUserProvider>
        <QueryContext>
          <SocketContext />
          {children}
        </QueryContext>
      </CurrentUserProvider>
    </SessionProvider>
  );
} 