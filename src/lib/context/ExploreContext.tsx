import React, { createContext, useContext, ReactNode } from "react"; // Removed useState
import { useToExplore } from "@/lib/hooks/useToExplore";
import { HistoryItem } from "@/lib/types/history";
import { ExploreItem } from "@/lib/types/explore";

// Define the shape of the context value
interface ExploreContextType {
  isSaving: boolean;
  error: string | null;
  canPost: boolean;
  locationState: ReturnType<typeof useToExplore>["locationState"];
  showLocationModal: boolean;
  setShowLocationModal: (show: boolean) => void;
  setInputAddress: (address: string) => void;
  setInputCoordinates: (
    coordinates: { lat: number; lng: number } | null
  ) => void;
  setIsFetchingLocation: (isFetching: boolean) => void;
  setErrorMessage: (message: string) => void;
  setEnableLocation: (enable: boolean) => void;
  handleUseCurrentLocation: () => Promise<void>;
  handleGeocodeInputLocation: () => Promise<void>;
  itemToPost: HistoryItem | null; // Add state for the item being posted
  handleConfirm: (
    // history: HistoryItem, // Removed argument
    onSuccess?: (data: { success: boolean; data: ExploreItem }) => void
  ) => Promise<void>;
  handlePost: (item: HistoryItem) => void; // Add item argument
  postToExplore: (
    history: HistoryItem
  ) => Promise<{ success: boolean; data: ExploreItem }>;
  // Adjusted return type to match the hook
  unpublishFromExplore: (
    historyId: string,
    exploreId: string
  ) => Promise<{ success: boolean }>;
  closeLocationModal: () => void; // Add close helper if needed by consumers
}

// Create the context with a default undefined value
const ExploreContext = createContext<ExploreContextType | undefined>(undefined);

// Define the props for the provider
interface ExploreProviderProps {
  children: ReactNode;
}

// Create the provider component
export const ExploreProvider: React.FC<ExploreProviderProps> = ({
  children,
}) => {
  const exploreHookData = useToExplore();

  // The value provided by the context will be the object returned by the hook
  // Ensure all properties match ExploreContextType
  const contextValue: ExploreContextType = {
    isSaving: exploreHookData.isSaving,
    error: exploreHookData.error,
    canPost: exploreHookData.canPost,
    locationState: exploreHookData.locationState,
    showLocationModal: exploreHookData.showLocationModal,
    setShowLocationModal: exploreHookData.setShowLocationModal,
    setInputAddress: exploreHookData.setInputAddress,
    setInputCoordinates: exploreHookData.setInputCoordinates,
    setIsFetchingLocation: exploreHookData.setIsFetchingLocation,
    setErrorMessage: exploreHookData.setErrorMessage,
    setEnableLocation: exploreHookData.setEnableLocation,
    handleUseCurrentLocation: exploreHookData.handleUseCurrentLocation,
    handleGeocodeInputLocation: exploreHookData.handleGeocodeInputLocation,
    handleConfirm: exploreHookData.handleConfirm,
    handlePost: exploreHookData.handlePost,
    postToExplore: exploreHookData.postToExplore,
    unpublishFromExplore: exploreHookData.unpublishFromExplore,
    itemToPost: exploreHookData.itemToPost, // Include itemToPost
    closeLocationModal: exploreHookData.closeLocationModal, // Include closeLocationModal again
  };

  return (
    <ExploreContext.Provider value={contextValue}>
      {children}
    </ExploreContext.Provider>
  );
};

// Create a custom hook for consuming the context
export const useExploreContext = (): ExploreContextType => {
  const context = useContext(ExploreContext);
  if (context === undefined) {
    throw new Error("useExploreContext must be used within an ExploreProvider");
  }
  return context;
};
