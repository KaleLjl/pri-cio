export interface HistoryItem {
  _id: string;
  imageUrl: string;
  price: string;
  description: string;
  createdAt: string;
  currency: string;
  exploreId?: string;
  userEmail: string;
}

export interface DealingItem extends HistoryItem {
  role: 'buyer' | 'seller';
  status: 'pending' | 'completed' | 'cancelled';
  dealingId: string;
  otherPartyEmail: string;
  buyerId: string;
  sellerId: string;
}