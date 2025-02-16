import { UserProfile } from './user';

export interface ExploreItem {
    _id: string;
    images: {
      id: string;
      url: string;
      isPrimary: boolean;
    }[];
    imageUrl?: string;
    price: string;
    description: string;
    userEmail: string;
    historyId: string;
    currency: string;
    userProfile?: {
      _id?: string;
      avatarUrl?: string;
      name?: string;
    };
    location?: {
      latitude: number;
      longitude: number;
      city?: string;
      country?: string;
    };
    exploreId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ExploreItemResponse {
  items: ExploreItem[];
  total: number;
  hasMore: boolean;
}