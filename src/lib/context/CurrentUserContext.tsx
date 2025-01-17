"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface CurrentUser {
  _id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

interface CurrentUserContextValue {
  currentUser: CurrentUser | null;
  loadingUser: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue>({
  currentUser: null,
  loadingUser: true,
});

export const useCurrentUser = () => useContext(CurrentUserContext);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCurrentUser() {
      if (status === "loading") return;

      try {
        if (!session?.user?.email) {
          setCurrentUser(null);
          return;
        }

        const response = await fetch("/api/users/me");
        if (!response.ok) {
          throw new Error("Failed to fetch current user");
        }

        const userData = await response.json();
        if (!cancelled) {
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        if (!cancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingUser(false);
        }
      }
    }

    fetchCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  return (
    <CurrentUserContext.Provider value={{ currentUser, loadingUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
} 