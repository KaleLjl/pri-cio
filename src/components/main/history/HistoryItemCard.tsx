import React, { useState } from "react"; // Keep only one import line, remove useContext
import Image from "next/image";
import { HistoryItem } from "@/lib/types/history";
import { CURRENCIES, Currency } from "@/components/main/createpost/CreatePost";
// import ToExplore from "@/components/main/history/ToExplore"; // Removed - Will use context
import { useExploreContext } from "@/lib/context/ExploreContext"; // Import the context hook

interface HistoryItemCardProps {
  history: HistoryItem;
  isPosted: boolean;
  onOpenCard: (item: HistoryItem) => void;
  onDelete: (historyId: string) => void;
  onUnpublish: (historyId: string, exploreId: string) => void;
  // onPostSuccess: () => void; // Removed - Handled by context's handleConfirm
  // locationPermission: "granted" | "denied" | "prompt" | null; // Removed - Handled by context
  // onLocationPermissionChange: (permission: "granted" | "denied") => void; // Removed - Handled by context
  actionInProgress: string | undefined; // Track action for this specific card
}

const HistoryItemCard: React.FC<HistoryItemCardProps> = ({
  history,
  isPosted,
  onOpenCard,
  onDelete,
  onUnpublish,
  // onPostSuccess, // Removed
  // locationPermission, // Removed
  // onLocationPermissionChange, // Removed
  actionInProgress,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  // Consume the context
  const { handlePost, isSaving: isPosting } = useExploreContext();

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === history._id ? null : history._id);
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setActiveDropdown(null); // Close dropdown after action
  };

  const primaryImageUrl =
    history.images && history.images.length > 0
      ? history.images.find((img) => img.isPrimary)?.url ||
        history.images[0]?.url ||
        "/fallback.jpg"
      : history.imageUrl || "/fallback.jpg";

  return (
    <div
      key={history._id}
      className="relative bg-white rounded-2xl shadow-lg overflow-hidden group w-60 h-80 mx-auto cursor-pointer"
      onMouseLeave={() => setActiveDropdown(null)}
      onClick={() => onOpenCard(history)}
    >
      <div className="relative w-full h-full">
        {/* Primary Image */}
        <Image
          src={primaryImageUrl}
          alt={history.description || "No description available"}
          fill
          style={{ objectFit: "cover" }}
          className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
        />

        {/* Thumbnail Navigation */}
        {history.images && history.images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {history.images.map(
              (
                image // Removed unused 'index' parameter
              ) => (
                <div
                  key={image.id}
                  className={`w-2 h-2 rounded-full ${
                    image.isPrimary ? "bg-white" : "bg-gray-400"
                  }`}
                />
              )
            )}
          </div>
        )}

        <div className="absolute top-2 right-2 flex items-center gap-2">
          <div className="relative">
            <button
              onClick={handleDropdownToggle}
              className="text-white hover:text-gray-800 px-2 py-1 rounded"
            >
              •••
            </button>
            {activeDropdown === history._id && (
              <div className="absolute right-0 top-full mt-1 w-30 bg-black shadow-lg rounded-lg z-50">
                {!isPosted ? (
                  <>
                    {/* Use context directly */}
                    <button
                      onClick={(e) => {
                        handleActionClick(e, () => {
                          // Call handlePost from context, passing the history item
                          handlePost(history);
                          // Note: onSuccess logic needs to be handled within the context's handleConfirm now
                        });
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50 flex items-center"
                      disabled={isPosting || !!actionInProgress}
                    >
                      <i className="fas fa-share mr-2"></i>
                      {isPosting ? "Posting..." : "Post to Explore"}
                    </button>
                    <button
                      onClick={
                        (e) => handleActionClick(e, () => onDelete(history._id)) // Keep delete logic
                      }
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50 flex items-center"
                      disabled={!!actionInProgress}
                    >
                      <i className="fas fa-trash mr-2"></i>
                      {actionInProgress === "deleting"
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) =>
                      handleActionClick(e, () =>
                        onUnpublish(history._id, history.exploreId!)
                      )
                    }
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50 flex items-center"
                    disabled={!!actionInProgress}
                  >
                    <i className="fas fa-ban mr-2"></i>
                    {actionInProgress === "unpublishing"
                      ? "Unpublishing..."
                      : "Unpublish"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div
          className="absolute bottom-0 left-0 w-full text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))",
          }}
        >
          <p className="text-lg font-semibold text-white">
            {CURRENCIES.find((c: Currency) => c.value === history.currency)
              ?.symbol || history.currency}{" "}
            {history.price || "N/A"}
          </p>
          <p className="text-sm mt-1">
            {history.description || "No description available"}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            {history.createdAt
              ? new Date(history.createdAt).toLocaleString()
              : "Date not available"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HistoryItemCard;
