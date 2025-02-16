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
  role: 'buying' | 'selling';
  status: 'pending' | 'completed' | 'cancelled';
  otherPartyEmail: string;
}