export interface ExploreItem {
    _id: string;
    imageUrl: string;
    price: string;
    description: string;
    userEmail: string;
    userProfile?: {
      name?: string;
      avatarUrl?: string | null;
    };
    location?: {
      latitude: number;
      longitude: number;
      city: string;
      country: string;
    } | null;
    createdAt: string;
}