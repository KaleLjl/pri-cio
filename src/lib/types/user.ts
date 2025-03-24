export interface UserProfile {
  _id?: string;
  email?: string;
  name?: string;
  about?: string;
  website?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseProfilePage {
  avatarUrl: string | null;
  formData: UserProfile;
  handleAvatarChange: (file: File) => Promise<void>;
  handleInputChange: (name: string, value: string) => void;
  resetForm: () => void;
  saveProfile: () => Promise<void>;
  fetchProfileData: () => Promise<UserProfile>;
}