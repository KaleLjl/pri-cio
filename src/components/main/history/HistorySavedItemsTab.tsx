import React from "react";
import { HistoryItem, DealingItem } from "@/lib/types/history";
import HistoryItemCard from "./HistoryItemCard";

interface HistorySavedItemsTabProps {
  savedItemsRef: React.RefObject<HTMLDivElement>;
  histories: HistoryItem[];
  dealingHistories: DealingItem[];
  savedItemsCount: number;
  onOpenCard: (item: HistoryItem) => void;
  onDelete: (historyId: string) => void;
  // onPostSuccess: () => void; // Removed - Handled by context
  // locationPermission: "granted" | "denied" | "prompt" | null; // Removed - Handled by context
  // onLocationPermissionChange: (permission: "granted" | "denied") => void; // Removed - Handled by context
  actionInProgress: { [key: string]: string };
}

const HistorySavedItemsTab: React.FC<HistorySavedItemsTabProps> = ({
  savedItemsRef,
  histories,
  dealingHistories,
  savedItemsCount,
  onOpenCard,
  onDelete,
  // onPostSuccess, // Removed
  // locationPermission, // Removed
  // onLocationPermissionChange, // Removed
  actionInProgress,
}) => {
  const savedItems = histories.filter((history) => {
    const isPosted = history.exploreId !== undefined;
    const isDealing = dealingHistories.some((deal) => deal._id === history._id);
    return !isPosted && !isDealing;
  });

  return (
    <div ref={savedItemsRef}>
      <h2 className="text-2xl font-bold mb-6 flex items-center text-white">
        <span>Saved Items</span>
        <span className="ml-3 text-sm font-normal text-gray-500">
          ({savedItemsCount} items)
        </span>
      </h2>
      {savedItems.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No saved items</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {savedItems.map((history) => (
            <HistoryItemCard
              key={history._id}
              history={history}
              isPosted={false}
              onOpenCard={onOpenCard}
              onDelete={onDelete}
              onUnpublish={() => {}} // Not applicable for saved items
              // onPostSuccess={onPostSuccess} // Removed - Handled by context
              // locationPermission={locationPermission} // Removed
              // onLocationPermissionChange={onLocationPermissionChange} // Removed
              actionInProgress={actionInProgress[history._id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistorySavedItemsTab;
