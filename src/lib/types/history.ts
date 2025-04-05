export interface HistoryItem {
  _id: string;
  userEmail: string;
  price: string;
  description: string;
  images: {
    id: string;
    url: string;
    isPrimary: boolean;
  }[];
  imageUrl?: string;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
  exploreId?: string;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  userProfile?: {
    _id: string;
    name?: string;
    avatarUrl?: string;
  };
}

export interface DealingItem extends HistoryItem {
  dealingId: string;
  role: "buying" | "selling";
  status: "pending" | "completed" | "cancelled";
  otherPartyEmail: string;
}

// Data required to complete a deal
export interface DealCompletionData {
  historyId: string;
  exploreId: string;
  buyerId: string;
  sellerId: string;
  meetingTime: string;
  location: string;
  suggestedPrice: string;
}

// Data required to create a new history item
export interface CreateHistoryData {
  userEmail: string;
  price?: string; // Price might be optional initially if using AI
  description?: string; // Description might be optional initially
  images: {
    // Raw image data (e.g., base64) before S3 upload
    id: string;
    url: string; // This would be the base64 data URL initially
    isPrimary: boolean;
  }[];
  currency: string;
}

// Type for the data returned after creating a history item
export interface CreatedHistoryItem {
  _id: string;
  images: {
    // Images with S3 URLs
    id: string;
    url: string;
    isPrimary: boolean;
  }[];
}
