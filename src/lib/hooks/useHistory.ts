import { useState, useCallback } from "react"; // Import useCallback
import { useSession } from "next-auth/react";
import { HistoryItem, DealingItem } from "@/lib/types/history";

export function useHistory(initialData: HistoryItem[] = []) {
  const { data: session } = useSession();
  const [histories, setHistories] = useState<HistoryItem[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("locationPermission");
      }
      return null;
    }
  );

  // User profile states
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Dealing items states
  const [dealingHistories, setDealingHistories] = useState<DealingItem[]>([]);
  const [isDealingLoading, setIsDealingLoading] = useState(false);

  const deleteHistory = async (historyId: string) => {
    if (!session?.user?.email) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await fetch(`/api/history/${historyId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete history");
      }

      setHistories((prev) =>
        prev.filter((history) => history._id !== historyId)
      );
      return { success: true };
    } catch (error) {
      console.error("Delete history failed:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete history"
      );
      throw error;
    }
  };

  const saveToHistory = async (
    price: string,
    description: string,
    images: { id: string; url: string; isPrimary: boolean }[],
    currency: string
  ) => {
    if (!session?.user?.email) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price,
          description,
          images,
          currency,
          userEmail: session.user.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save to history");
      }

      const newHistory = await response.json();
      setHistories((prev) => [...prev, newHistory]);
      return newHistory;
    } catch (error) {
      console.error("Save to history failed:", error);
      setError(
        error instanceof Error ? error.message : "Failed to save to history"
      );
      throw error;
    }
  };

  const refreshHistories = async () => {
    if (!session?.user?.email) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/history");
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }
      const data = await response.json();
      setHistories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  const updateHistory = async (
    historyId: string,
    updates: { price?: string; description?: string }
  ) => {
    if (!session?.user?.email) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await fetch(`/api/history/${historyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update history");
      }

      setHistories((prev) =>
        prev.map((history) =>
          history._id === historyId ? { ...history, ...updates } : history
        )
      );

      return { success: true };
    } catch (error) {
      console.error("Update history failed:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update history"
      );
      throw error;
    }
  };

  // User profile fetch function (Memoized)
  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return; // Check for session user ID

    try {
      // Fetch from the correct endpoint
      const response = await fetch(`/api/users/me`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }
      // Response is the UserProfile object directly
      const userProfile = await response.json();

      // Update state directly from the userProfile object
      setAvatarUrl(userProfile?.avatarUrl || null);
      setUserName(userProfile?.name || null);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setAvatarUrl(null);
      setUserName(null);
      setError(
        error instanceof Error ? error.message : "Failed to fetch user profile"
      );
    }
  }, [session?.user?.id]); // Dependency: session.user.id

  // Dealing items fetch function (Memoized)
  const fetchDealingItems = useCallback(async () => {
    if (!session?.user?.email) return;

    setIsDealingLoading(true);
    try {
      const response = await fetch("/api/chat/deal");
      if (!response.ok) {
        throw new Error("Failed to fetch dealing items");
      }
      const data = await response.json();
      setDealingHistories(data);
    } catch (error) {
      console.error("Error fetching dealing items:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch dealing items"
      );
    } finally {
      setIsDealingLoading(false);
    }
  }, [session?.user?.email]); // Dependency: session.user.email

  return {
    histories,
    setHistories,
    isLoading,
    error,
    deleteHistory,
    refreshHistories,
    saveToHistory,
    updateHistory,
    locationPermission,
    setLocationPermission,
    avatarUrl,
    userName,
    fetchUserProfile,
    dealingHistories,
    setDealingHistories,
    isDealingLoading,
    fetchDealingItems,
  };
}
