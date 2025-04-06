// src/lib/context/CurrentUserContext.tsx
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

export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true); // Start as true

  useEffect(() => {
    let cancelled = false;
    // Removed console.log for Effect start

    async function fetchCurrentUser() {
      if (status === "loading") {
        // Removed console.log
        if (!cancelled) setLoadingUser(true); // Ensure loading state is true
        return;
      }

      if (status === "unauthenticated") {
        // Removed console.log
        if (!cancelled) {
          setCurrentUser(null);
          setLoadingUser(false);
          // Removed console.log for state set
        }
        return;
      }

      // Only proceed if authenticated
      if (status === "authenticated") {
        if (!session?.user?.email) {
          // This is the potential problem area - authenticated but email not ready
          // Removed console.log
          // Keep loading state true until email appears or status changes
          if (!cancelled) setLoadingUser(true);
          return;
        }

        // Removed console.log for attempting fetch
        try {
          const response = await fetch("/api/users/me");
          // Removed console.log for fetch status
          if (!response.ok) {
            if (response.status === 401) {
              // Removed console.warn
              if (!cancelled) {
                setCurrentUser(null);
              }
              // Return here, finally block handles loading state
              return;
            }
            throw new Error(
              `Failed to fetch current user (Status: ${response.status})`
            );
          }

          const userData = await response.json();
          if (!cancelled) {
            setCurrentUser(userData);
            // Removed console.log for fetch success
          }
        } catch (error) {
          // Removed console.error
          // Log actual errors in production if needed via a logging service
          console.error("Error fetching current user:", error); // Keep basic error log
          if (!cancelled) {
            setCurrentUser(null);
          }
        } finally {
          if (!cancelled) {
            setLoadingUser(false);
            // Removed console.log for fetch finish
          }
        }
      }
    }

    fetchCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [session, status]); // Keep original dependencies for now

  // Removed logging useEffect for context value changes

  return (
    <CurrentUserContext.Provider value={{ currentUser, loadingUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}
