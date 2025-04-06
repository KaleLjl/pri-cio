import React from "react";
import Image from "next/image";
import { DealingItem } from "@/lib/types/history";
import { CURRENCIES, Currency } from "@/components/main/CreatePost";

interface DealingItemCardProps {
  item: DealingItem;
  onUpdateStatus: (
    dealingId: string,
    status: "completed" | "cancelled"
  ) => void;
}

const DealingItemCard: React.FC<DealingItemCardProps> = ({
  item,
  onUpdateStatus,
}) => {
  const primaryImageUrl = item.imageUrl || "/fallback.jpg";

  return (
    // Style reverted to match HistoryItemCard (fixed height, hover effect)
    <div
      key={item._id}
      className="relative bg-white rounded-2xl shadow-lg overflow-hidden group w-60 h-80 mx-auto cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
    >
      <div className="relative w-full h-full">
        <Image
          src={primaryImageUrl}
          alt={item.description || "No description available"}
          fill
          style={{ objectFit: "cover" }}
          className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
        />

        {/* Status Badges remain absolutely positioned */}
        <div
          className={`absolute top-2 left-2 px-3 py-1 rounded-full text-sm font-medium ${
            item.role === "buying" ? "bg-blue-500" : "bg-green-500"
          } text-white shadow-lg`}
        >
          {item.role === "buying" ? "Buyer" : "Seller"}
        </div>
        <div
          className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-medium ${
            item.status === "pending"
              ? "bg-yellow-500"
              : item.status === "completed"
              ? "bg-green-500"
              : "bg-red-500"
          } text-white shadow-lg`}
        >
          {item.status}
        </div>

        {/* Item Details Overlay */}
        <div
          className="absolute bottom-0 left-0 w-full text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))",
          }}
        >
          <p className="text-lg font-semibold text-white mb-2">
            {CURRENCIES.find((c: Currency) => c.value === item.currency)
              ?.symbol || item.currency}{" "}
            {item.price || "N/A"}
          </p>
          <p className="text-sm text-white mb-2">
            {item.description || "No description available"}
          </p>
          <p className="text-xs text-gray-300 mb-3">
            {item.createdAt
              ? new Date(item.createdAt).toLocaleString()
              : "Date not available"}
          </p>

          {/* Display final details if completed (within overlay) */}
          {item.status === "completed" && (
            <div className="text-xs mt-2 text-gray-200">
              <p>
                Final Price:{" "}
                {item.finalPrice
                  ? `${
                      CURRENCIES.find(
                        (c: Currency) => c.value === item.currency
                      )?.symbol || item.currency
                    } ${item.finalPrice}`
                  : "N/A"}
              </p>
              <p>Meeting Time: {item.meetingTime || "N/A"}</p>
              <p>Location: {item.finalLocation || "N/A"}</p>
            </div>
          )}

          {/* Action Buttons (only if status is pending, within overlay) */}
          {item.status === "pending" && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(item.dealingId, "completed");
                }}
                className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Complete
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(item.dealingId, "cancelled");
                }}
                className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealingItemCard;
