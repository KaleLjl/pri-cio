import React from "react";
import { DealingItem } from "@/lib/types/history";
import DealingItemCard from "./DealingItemCard";
import Loading from "@/components/shared/Loading";

interface HistoryDealingItemsTabProps {
  dealingItemsRef: React.RefObject<HTMLDivElement>;
  dealingHistories: DealingItem[];
  isDealingLoading: boolean;
  onUpdateStatus: (
    dealingId: string,
    status: "completed" | "cancelled"
  ) => void;
}

const HistoryDealingItemsTab: React.FC<HistoryDealingItemsTabProps> = ({
  dealingItemsRef,
  dealingHistories,
  isDealingLoading,
  onUpdateStatus,
}) => {
  return (
    <div ref={dealingItemsRef}>
      <h2 className="text-2xl font-bold mb-4 flex items-center text-white">
        <span>Dealing Items</span>
        <span className="ml-3 text-sm font-normal text-gray-500">
          ({dealingHistories.length} items)
        </span>
      </h2>

      {isDealingLoading ? (
        <Loading text="Loading dealing items..." />
      ) : dealingHistories.length === 0 ? (
        <div className="text-center text-white py-10">No dealing items</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {dealingHistories.map((item) => (
            <DealingItemCard
              key={item._id} // Use item._id which is the historyId
              item={item}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryDealingItemsTab;
