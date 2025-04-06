import React from "react";

type HistoryTab = "saved" | "posted" | "dealing";

interface HistoryTabControlsProps {
  activeTab: HistoryTab;
  onTabChange: (tab: HistoryTab) => void;
}

const HistoryTabControls: React.FC<HistoryTabControlsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="mt-4 flex justify-center space-x-4">
      <button
        onClick={() => onTabChange("saved")}
        className={`px-4 py-2 rounded-lg transition-all duration-300 ${
          activeTab === "saved"
            ? "bg-purple-600 text-white"
            : "bg-gray-200 text-black"
        }`}
      >
        Saved Items
      </button>
      <button
        onClick={() => onTabChange("posted")}
        className={`px-4 py-2 rounded-lg transition-all duration-300 ${
          activeTab === "posted"
            ? "bg-purple-600 text-white"
            : "bg-gray-200 text-black"
        }`}
      >
        Posted Items
      </button>
      <button
        onClick={() => onTabChange("dealing")}
        className={`px-4 py-2 rounded-lg transition-all duration-300 ${
          activeTab === "dealing"
            ? "bg-purple-600 text-white"
            : "bg-gray-200 text-black"
        }`}
      >
        Dealing Items
      </button>
    </div>
  );
};

export default HistoryTabControls;
