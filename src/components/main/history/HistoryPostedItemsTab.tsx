import React from "react";
import { HistoryItem } from "@/lib/types/history";
import HistoryItemCard from "./HistoryItemCard";

interface HistoryPostedItemsTabProps {
  postedItemsRef: React.RefObject<HTMLDivElement>;
  postedHistories: HistoryItem[];
  onOpenCard: (item: HistoryItem) => void;
  onUnpublish: (historyId: string, exploreId: string) => void;
  actionInProgress: { [key: string]: string };
}

const HistoryPostedItemsTab: React.FC<HistoryPostedItemsTabProps> = ({
  postedItemsRef,
  postedHistories,
  onOpenCard,
  onUnpublish,
  actionInProgress,
}) => {
  return (
    <div ref={postedItemsRef}>
      <h2 className="text-2xl font-bold mb-4 flex items-center text-white">
        <span>Posted Items</span>
        <span className="ml-3 text-sm font-normal text-gray-500">
          ({postedHistories.length} items)
        </span>
      </h2>
      {postedHistories.length === 0 ? (
        <div className="text-center text-white py-10">No posted items</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {postedHistories.map((history) => (
            <HistoryItemCard
              key={history._id}
              history={history}
              isPosted={true}
              onOpenCard={onOpenCard}
              onDelete={() => {}} // Not applicable for posted items
              onUnpublish={onUnpublish}
              onPostSuccess={() => {}} // Not applicable
              locationPermission={null} // Not applicable
              onLocationPermissionChange={() => {}} // Not applicable
              actionInProgress={actionInProgress[history._id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPostedItemsTab;
