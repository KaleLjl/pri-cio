export interface User {
    _id: string;
    email: string;
    username: string;
    avatarUrl: string;
    website?: string;
    createdAt: Date;
    updatedAt: Date;
  }