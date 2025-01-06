import { useState, useCallback } from "react";
import { useSession } from 'next-auth/react';

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

export const useProfilePage = (userId: string): UseProfilePage => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { data: session } = useSession();
  const [formData, setFormData] = useState<Profile>({
    name: "",
    about: "",
    website: "",
    avatarUrl: null,
    updatedAt: new Date(),
  });

  const handleAvatarChange = async (file: File) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      setAvatarUrl(objectUrl);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Data = reader.result as string;
        setAvatar(base64Data);
      };
    } catch (error) {
      console.error("Error handling avatar change:", error);
      alert("Failed to process image");
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      about: "",
      website: "",
      avatarUrl: null,
      updatedAt: new Date(),
    });
    setAvatar(null);
    setAvatarUrl(null);
  };

  const saveProfile = async () => {
    try {
      const response = await fetch(`/api/editprofile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: session?.user?.email,
          ...formData,
          avatar: avatar,
          currentAvatarUrl: formData.avatarUrl,
          updatedAt: new Date()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error details:", errorData);
        throw new Error("Failed to save profile");
      }

      const result = await response.json();
      console.log("Profile saved successfully!", result);
      
      setFormData(prev => ({
        ...prev,
        avatarUrl: result.profile.avatarUrl
      }));
      
      setAvatar(null);
      alert("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile");
    }
  };

  const fetchProfileData = useCallback(async () => {
    try {
      const response = await fetch(`/api/editprofile`);
      if (!response.ok) {
        console.warn(`Failed to fetch profile data: ${response.statusText}`);
        return {
          name: "",
          about: "",
          website: "",
          avatarUrl: null,
          updatedAt: new Date(),
        };
      }
  
      const profiles: Profile[] = await response.json();
      const userProfile = profiles.find((profile: Profile) => profile.email === session?.user?.email);
  
      if (userProfile) {
        setFormData({
          name: userProfile.name || "",
          about: userProfile.about || "",
          website: userProfile.website || "",
          avatarUrl: userProfile.avatarUrl || null,
          updatedAt: userProfile.updatedAt || new Date(),
        });
        setAvatarUrl(userProfile.avatarUrl || null);
  
        return userProfile;
      }
  
      return {
        name: "",
        about: "",
        website: "",
        avatarUrl: null,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error fetching profile data:", error);
      throw error;
    }
  }, [session?.user?.email]);

  return {
    avatarUrl,
    formData,
    handleAvatarChange,
    handleInputChange,
    resetForm,
    saveProfile,
    fetchProfileData,
  };
};