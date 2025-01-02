import { useState } from "react";
import { useSession } from 'next-auth/react';

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  about: string;
  pronouns: string;
  website: string;
  username: string;
}

export interface UseProfilePage {
  avatar: string | null;
  formData: ProfileFormData;
  handleAvatarChange: (file: File) => void;
  handleInputChange: (name: string, value: string) => void;
  resetForm: () => void;
  saveProfile: () => void;
}

export const useProfilePage = (userId: string): UseProfilePage => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const { data: session } = useSession();
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    about: "",
    pronouns: "",
    website: "",
    username: "",
  });

  // Handle avatar image change
  const handleAvatarChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle input field changes
  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset form and avatar
  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      about: "",
      pronouns: "",
      website: "",
      username: "",
    });
    setAvatar(null);
  };

  const saveProfile = async () => {
    try {
      console.log("User email:", session?.user?.email);
      const response = await fetch(`/api/editprofile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: session?.user?.email,
          ...formData, 
          avatar 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error details:", errorData);
        throw new Error("Failed to save profile");
      }

      const result = await response.json();
      console.log("Profile saved successfully!", result);
      alert("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile");
    }
  };

  return {
    avatar,
    formData,
    handleAvatarChange,
    handleInputChange,
    resetForm,
    saveProfile,
  };
};
