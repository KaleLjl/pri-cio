export interface UserProfile {
  _id: string;
  email?: string;
  name?: string;
  about?: string;
  website?: string;
  avatarUrl?: string | null;
  // Use Date for timestamps as returned by MongoDB driver
  createdAt?: Date;
  updatedAt?: Date;
}

// This interface seems related to a specific hook/page, not a general update type
export interface UseProfilePage {
  avatarUrl: string | null;
  formData: UserProfile;
  handleAvatarChange: (file: File) => Promise<void>;
  handleInputChange: (name: string, value: string) => void;
  resetForm: () => void;
  saveProfile: () => Promise<void>;
  fetchProfileData: () => Promise<UserProfile>;
}
