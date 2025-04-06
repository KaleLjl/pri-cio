"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useHistory } from "@/lib/hooks/useHistory";
import { HistoryItem } from "@/lib/types/history"; // Removed unused DealingItem import
import { useSession } from "next-auth/react"; // To fetch user session data
// import Image from "next/image"; // Removed unused import
import { AnimatePresence } from "framer-motion";
import Toast from "@/components/shared/Toast";
// import { CURRENCIES, Currency } from "@/components/main/CreatePost"; // Removed unused import
// import ImageWithFallback from "@/components/shared/ImageWithFallback"; // Removed unused import
import Loading from "@/components/shared/Loading";
import ItemDetailModal from "@/components/shared/ItemDetailModal";
import { useRouter } from "next/navigation";
// import ToExplore from "@/components/shared/ToExplore"; // Removed unused import
import { useToExplore } from "@/lib/hooks/useToExplore";
import HistoryProfileHeader from "./history/HistoryProfileHeader";
import HistoryTabControls from "./history/HistoryTabControls";
import HistorySavedItemsTab from "./history/HistorySavedItemsTab";
import HistoryPostedItemsTab from "./history/HistoryPostedItemsTab";
import HistoryDealingItemsTab from "./history/HistoryDealingItemsTab";
// import { DealingItem } from "@/lib/types/history"; // Removed unused import

interface HistoryProps {
  histories: HistoryItem[];
}

export default function History({ histories: initialHistories }: HistoryProps) {
  const {
    histories,
    setHistories,
    isLoading,
    error,
    deleteHistory,
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
  } = useHistory(initialHistories);
  const { unpublishFromExplore } = useToExplore();

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "info"
  );

  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  // const userEmail = session?.user?.email || ""; // Keep if needed for other logic, remove if not
  // const emailInitial = userEmail.charAt(0).toUpperCase(); // Removed unused variable
  const [activeTab, setActiveTab] = useState<"saved" | "posted" | "dealing">(
    "saved"
  );
  // const [transitionDirection, setTransitionDirection] = useState< // Removed unused variable
  //   "left" | "right"
  // >("right");
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const savedItemsRef = useRef<HTMLDivElement>(null);
  const postedItemsRef = useRef<HTMLDivElement>(null);
  const dealingItemsRef = useRef<HTMLDivElement>(null);
  const [postedHistories, setPostedHistories] = useState<HistoryItem[]>([]);
  const savedItemsCount = histories.filter((history) => {
    const isPosted = history.exploreId !== undefined;
    const isDealing = dealingHistories.some((deal) => deal._id === history._id);
    return !isPosted && !isDealing;
  }).length;

  const router = useRouter();
  const currentUserId = session?.user?.id || "";

  // Toast management function
  const showNewToast = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setShowToast(false);
    setTimeout(() => {
      setToastMessage(message);
      setToastType(type);
      setShowToast(true);
    }, 100);
  };

  // Tab management function
  const handleTabChange = (tab: "saved" | "posted" | "dealing") => {
    if (tab !== activeTab) {
      // The transitionDirection state was removed, so the logic setting it is also removed.
      setActiveTab(tab);
    }
  };

  // Container height management functions (Memoized)
  const updateContainerHeight = useCallback(() => {
    if (activeTab === "saved" && savedItemsRef.current) {
      setContainerHeight(savedItemsRef.current.offsetHeight);
    } else if (activeTab === "posted" && postedItemsRef.current) {
      setContainerHeight(postedItemsRef.current.offsetHeight);
    } else if (activeTab === "dealing" && dealingItemsRef.current) {
      setContainerHeight(dealingItemsRef.current.offsetHeight);
    }
  }, [activeTab]); // Dependency: activeTab (refs are stable)

  // Posted histories management function (Memoized)
  const updatePostedHistories = useCallback(() => {
    const posted = histories.filter((history) => history.exploreId);
    setPostedHistories(posted);
  }, [histories]); // Dependency: histories

  // Initialize all data
  useEffect(() => {
    // Initialize user profile
    fetchUserProfile();

    // Initialize container height with delay
    const heightTimer = setTimeout(updateContainerHeight, 100);
    window.addEventListener("resize", updateContainerHeight);

    // Initialize posted histories
    updatePostedHistories();

    // Initialize dealing items
    fetchDealingItems();

    // Cleanup function
    return () => {
      window.removeEventListener("resize", updateContainerHeight);
      clearTimeout(heightTimer);
    };
    // Added memoized functions and hook functions to dependency array
  }, [
    session?.user?.email,
    activeTab,
    histories,
    fetchDealingItems,
    fetchUserProfile,
    updateContainerHeight,
    updatePostedHistories,
  ]);

  const [actionInProgress, setActionInProgress] = useState<{
    [key: string]: string;
  }>({});
  // const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // Removed unused variable
  const [selectedCard, setSelectedCard] = useState<HistoryItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  const handleDelete = async (historyId: string) => {
    try {
      setActionInProgress({ ...actionInProgress, [historyId]: "deleting" });
      await deleteHistory(historyId);
      showNewToast("Successfully deleted!", "success");
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : "Failed to delete history",
        "error"
      );
    } finally {
      setActionInProgress({ ...actionInProgress, [historyId]: "" });
    }
  };

  const handleOpenCard = useCallback(
    (item: HistoryItem) => {
      setSelectedCard({
        ...item,
        userProfile: {
          _id: userId,
          name: userName || session?.user?.name || "",
          avatarUrl: avatarUrl || "",
        },
      });
      setCurrentImageIndex(0);
    },
    [userId, userName, session?.user?.name, avatarUrl]
  );

  const handlePrevImage = useCallback(() => {
    if (!selectedCard?.images?.length) return;
    const images = selectedCard.images;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [selectedCard]);

  const handleNextImage = useCallback(() => {
    if (!selectedCard?.images?.length) return;
    const images = selectedCard.images;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [selectedCard]);

  const handleGetDirections = useCallback((lat: number, lng: number) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.open(
            `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${lat},${lng}`,
            "_blank"
          );
        },
        (err) => {
          console.error("Error fetching location:", err);
          alert("Enable location to get directions");
        }
      );
    } else {
      alert("Geolocation not supported");
    }
  }, []);

  const handleSendMessage = useCallback(
    (userId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!userId) return;
      if (currentUserId === userId) return;
      router.push(`/chat/${userId}`);
    },
    [router, currentUserId]
  );

  const handleAvatarClick = useCallback(
    (userId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!userId) return;
      if (currentUserId === userId) return;
      router.push(`/chat/${userId}`);
    },
    [router, currentUserId]
  );

  const handleUnpublish = async (historyId: string, exploreId: string) => {
    try {
      setActionInProgress({ ...actionInProgress, [historyId]: "unpublishing" });
      await unpublishFromExplore(historyId, exploreId);

      // 更新本地状态
      setHistories((prev) =>
        prev.map((h) =>
          h._id === historyId ? { ...h, exploreId: undefined } : h
        )
      );

      showNewToast("Successfully unpublished!", "success");
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : "Failed to unpublish",
        "error"
      );
    } finally {
      setActionInProgress({ ...actionInProgress, [historyId]: "" });
    }
  };

  const handleUpdateDealingStatus = async (
    dealingId: string,
    status: "completed" | "cancelled"
  ) => {
    try {
      const response = await fetch(`/api/chat/deal/${dealingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update dealing status");
      }

      // 更新本地状态
      setDealingHistories((prev) =>
        prev.map((item) =>
          item.dealingId === dealingId ? { ...item, status } : item
        )
      );

      showNewToast(`Successfully ${status} the deal!`, "success");
    } catch (error) {
      showNewToast(
        error instanceof Error
          ? error.message
          : "Failed to update dealing status",
        "error"
      );
    }
  };

  // Location permission management
  const handleLocationPermission = (permission: "granted" | "denied") => {
    localStorage.setItem("locationPermission", permission);
    setLocationPermission(permission);
  };

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        Error loading history
      </div>
    );
  }

  if (isLoading) {
    return <Loading text="Loading history..." />;
  }

  console.log("Avatar URL:", avatarUrl);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-10"></h1>
      {/* Header Section */}
      <HistoryProfileHeader
        avatarUrl={avatarUrl}
        userName={userName}
        session={session}
        userId={userId}
        router={router}
      />

      {/* Tab Controls */}
      <HistoryTabControls activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div
        className="relative mt-6 overflow-hidden"
        style={{ height: containerHeight }}
      >
        <div
          className={`absolute w-full transition-transform duration-300 ${
            activeTab === "saved" ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            opacity: activeTab === "saved" ? 1 : 0,
            visibility: activeTab === "saved" ? "visible" : "hidden",
          }}
        >
          <HistorySavedItemsTab
            savedItemsRef={savedItemsRef}
            histories={histories}
            dealingHistories={dealingHistories}
            savedItemsCount={savedItemsCount}
            onOpenCard={handleOpenCard}
            onDelete={handleDelete}
            onPostSuccess={() => {
              showNewToast("Successfully posted to explore!", "success");
              // Optionally trigger a refetch or update local state if needed
            }}
            // Cast locationPermission to the expected type
            locationPermission={
              locationPermission as "granted" | "denied" | "prompt" | null
            }
            onLocationPermissionChange={handleLocationPermission}
            actionInProgress={actionInProgress}
          />
        </div>

        {/* Posted Items Section */}
        <div
          ref={postedItemsRef}
          className={`absolute w-full transition-transform duration-300 ${
            activeTab === "posted"
              ? "translate-x-0"
              : activeTab === "saved"
              ? "translate-x-full"
              : "-translate-x-full"
          }`}
          style={{
            transform:
              activeTab === "posted"
                ? "translateX(0)"
                : activeTab === "saved"
                ? "translateX(100%)"
                : "translateX(-100%)",
            opacity: activeTab === "posted" ? 1 : 0,
            visibility: activeTab === "posted" ? "visible" : "hidden",
          }}
        >
          <HistoryPostedItemsTab
            postedItemsRef={postedItemsRef}
            postedHistories={postedHistories}
            onOpenCard={handleOpenCard}
            onUnpublish={handleUnpublish}
            actionInProgress={actionInProgress}
          />
        </div>

        {/* Dealing Items Section */}
        <div
          ref={dealingItemsRef}
          className={`absolute w-full transition-transform duration-300 ${
            activeTab === "dealing" ? "translate-x-0" : "translate-x-full"
          }`}
          style={{
            transform:
              activeTab === "dealing" ? "translateX(0)" : "translateX(100%)",
            opacity: activeTab === "dealing" ? 1 : 0,
            visibility: activeTab === "dealing" ? "visible" : "hidden",
          }}
        >
          <HistoryDealingItemsTab
            dealingItemsRef={dealingItemsRef}
            dealingHistories={dealingHistories}
            isDealingLoading={isDealingLoading}
            onUpdateStatus={handleUpdateDealingStatus}
          />
        </div>
      </div>

      <div>
        <Toast
          message={toastMessage}
          isVisible={showToast}
          onClose={() => setShowToast(false)}
          type={toastType}
          duration={2000}
        />
      </div>

      <AnimatePresence>
        {selectedCard && (
          <ItemDetailModal
            item={selectedCard}
            currentImageIndex={currentImageIndex}
            onClose={() => setSelectedCard(null)}
            onPrevImage={handlePrevImage}
            onNextImage={handleNextImage}
            onAvatarClick={handleAvatarClick}
            onSendMessage={handleSendMessage}
            onGetDirections={handleGetDirections}
            currentUserId={currentUserId}
            onUpdate={async (id, updates) => {
              await updateHistory(id, updates);
              // Update both histories and selectedCard
              const updatedHistories = histories.map((h) =>
                h._id === id ? { ...h, ...updates } : h
              );
              setHistories(updatedHistories);

              // Update postedHistories immediately
              const updatedPostedHistories = updatedHistories.filter(
                (history) => history.exploreId
              );
              setPostedHistories(updatedPostedHistories);

              // Update the selectedCard to reflect changes immediately
              setSelectedCard((prev) =>
                prev ? { ...prev, ...updates } : null
              );

              showNewToast("Successfully updated!", "success");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
