export interface ExploreItem {
    _id: string;
    imageUrl: string;
    price: string;
    description: string;
    userEmail: string;
    location?: {
      latitude: number;
      longitude: number;
      city: string;
      country: string;
    } | null; // Optional field
    createdAt: string;
  }