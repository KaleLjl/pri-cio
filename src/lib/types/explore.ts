import { UserProfile } from './user';

export interface ExploreItem {
    _id: string;
    imageUrl: string;
    price: string;
    description: string;
    userEmail: string;
    historyId: string;
    currency: string;
    userProfile?: UserProfile;
    location?: {
      latitude: number;
      longitude: number;
      city: string;
      country: string;
    } | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ExploreItemResponse {
  items: ExploreItem[];
  total: number;
  hasMore: boolean;
}