import React from "react"; // Removed unused useContext
// import { useToExplore } from '@/lib/hooks/useToExplore'; // Removed hook import
import { useExploreContext } from "@/lib/context/ExploreContext"; // Import context hook
// import { HistoryItem } from "@/lib/types/history"; // Removed unused import
import { Switch as HeadlessSwitch } from "@headlessui/react";
import { ExploreItem } from "@/lib/types/explore"; // Import ExploreItem for onSuccess type

// Updated Props: Remove history prop, keep only onSuccess
interface ToExploreProps {
  // history: HistoryItem; // Removed - Will get from context
  onSuccess?: (data: { success: boolean; data: ExploreItem }) => void; // Keep onSuccess callback
}

export default function ToExplore({
  // history, // Removed
  onSuccess, // Keep onSuccess prop
}: ToExploreProps) {
  // Consume context
  const {
    isSaving,
    itemToPost, // Get the item from context
    locationState,
    showLocationModal,
    // setShowLocationModal, // Removed unused variable
    setInputAddress,
    setEnableLocation,
    handleUseCurrentLocation,
    handleGeocodeInputLocation,
    handleConfirm,
    closeLocationModal, // Use the close helper from context
    // handlePost is no longer needed here
  } = useExploreContext();

  // The component now only renders the modal, triggered by context state
  // Only render the modal content if an item is selected and the modal should be shown
  if (!showLocationModal || !itemToPost) {
    return null; // Don't render anything if modal shouldn't be shown or no item selected
  }

  return (
    <>
      {/* Location Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center visible bg-black/50`} // Always visible when rendered
        onClick={(e) => {
          e.stopPropagation();
          closeLocationModal(); // Use context helper to close and clear item
        }}
      >
        <div
          className="bg-zinc-900 p-8 rounded-xl shadow-2xl w-[480px] border border-zinc-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <h2 className="text-xl font-semibold text-white mb-6">
            Add Location
          </h2>

          <div className="flex flex-col gap-6">
            {/* Enable Location Switch */}
            <div className="flex items-center justify-between bg-zinc-800 p-4 rounded-lg">
              <label
                htmlFor="locationSwitch"
                className="text-white font-medium"
              >
                Use Current Location
              </label>
              <HeadlessSwitch
                checked={locationState.enableLocation}
                onChange={(checked) => {
                  setEnableLocation(checked);
                  if (checked) handleUseCurrentLocation();
                }}
                className={`${
                  locationState.enableLocation ? "bg-purple-600" : "bg-zinc-600"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200`}
              >
                <span
                  className={`${
                    locationState.enableLocation
                      ? "translate-x-6"
                      : "translate-x-1"
                  } inline-block h-4 w-4 transform bg-white rounded-full transition-transform duration-200`}
                />
              </HeadlessSwitch>
            </div>

            {/* Location Input */}
            <div className="space-y-4">
              <input
                type="text"
                value={locationState.inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                placeholder="Enter your location"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGeocodeInputLocation();
                }}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={locationState.isFetchingLocation}
              >
                {locationState.isFetchingLocation ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Searching...
                  </span>
                ) : (
                  "Search Location"
                )}
              </button>
            </div>

            {/* Error Message */}
            {locationState.errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-500 text-sm">
                  {locationState.errorMessage}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeLocationModal(); // Use context helper to close and clear item
                }}
                className="px-6 py-2.5 border border-zinc-600 text-white rounded-lg hover:bg-zinc-800 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Call handleConfirm from context, no need to pass history item
                  handleConfirm(onSuccess);
                }}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50"
                disabled={!locationState.inputCoordinates || isSaving} // Disable if no coords or saving
              >
                {isSaving ? "Confirming..." : "Confirm"}
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
