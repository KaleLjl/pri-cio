export interface Profile {
  email?: string;
  name?: string;
  about?: string;
  website?: string;
  avatarUrl?: string | null;
  updatedAt?: Date;
}

export interface UseProfilePage {
  avatarUrl: string | null;
  formData: Profile;
  handleAvatarChange: (file: File) => Promise<void>;
  handleInputChange: (name: string, value: string) => void;
  resetForm: () => void;
  saveProfile: () => Promise<void>;
  fetchProfileData: () => Promise<Profile>;
}