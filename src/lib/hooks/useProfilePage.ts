import { useState, useCallback } from "react";
import { useSession } from 'next-auth/react';

export interface Profile {
  email?: string; // Add optional email if needed for form updates
  firstName?: string;
  lastName?: string;
  about?: string;
  pronouns?: string;
  website?: string;
  username?: string;
  avatar?: string | null;
}


export interface UseProfilePage {
  avatar: string | null;
  formData: Profile;
  handleAvatarChange: (file: File) => void;
  handleInputChange: (name: string, value: string) => void;
  resetForm: () => void;
  saveProfile: () => void;
  fetchProfileData: () => Promise<{ avatar: string | null; formData: Profile }>;
}

export const useProfilePage = (userId: string): UseProfilePage => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const { data: session } = useSession();
  const [formData, setFormData] = useState<Profile>({
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

  // const fetchProfileData = useCallback(async () => {
  //   try {
  //     const response = await fetch(`/api/editprofile`);
  //     if (!response.ok) {
  //       throw new Error(`Failed to fetch profile data: ${response.statusText}`);
  //     }
  
  //     const profiles: Profile[] = await response.json();
  //     const userProfile = profiles.find((profile: Profile) => profile.email === session?.user?.email);
  
  //     if (userProfile) {
  //       setAvatar(userProfile.avatar || null);
  //       setFormData({
  //         firstName: userProfile.firstName || "",
  //         lastName: userProfile.lastName || "",
  //         about: userProfile.about || "",
  //         pronouns: userProfile.pronouns || "",
  //         website: userProfile.website || "",
  //         username: userProfile.username || "",
  //       });
  
  //       // Return the object in the expected format
  //       return {
  //         avatar: userProfile.avatar || null,
  //         formData: {
  //           firstName: userProfile.firstName || "",
  //           lastName: userProfile.lastName || "",
  //           about: userProfile.about || "",
  //           pronouns: userProfile.pronouns || "",
  //           website: userProfile.website || "",
  //           username: userProfile.username || "",
  //           email: userProfile.email, // Include email if needed
  //         },
  //       };
  //     }
  
  //     // Handle case where user profile is not found
  //     throw new Error("User profile not found");
  //   } catch (error) {
  //     console.error("Error fetching profile data:", error);
  //     throw error;
  //   }
  // }, [session?.user?.email]);
  const fetchProfileData = useCallback(async () => {
    try {
      const response = await fetch(`/api/editprofile`);
      if (!response.ok) {
        console.warn(`Failed to fetch profile data: ${response.statusText}`);
        return {
          avatar: null,
          formData: {
            firstName: "",
            lastName: "",
            about: "",
            pronouns: "",
            website: "",
            username: "",
          },
        };
      }
  
      const profiles: Profile[] = await response.json();
      const userProfile = profiles.find((profile: Profile) => profile.email === session?.user?.email);
  
      if (userProfile) {
        setAvatar(userProfile.avatar || null);
        setFormData({
          firstName: userProfile.firstName || "",
          lastName: userProfile.lastName || "",
          about: userProfile.about || "",
          pronouns: userProfile.pronouns || "",
          website: userProfile.website || "",
          username: userProfile.username || "",
        });
  
        // Return the object in the expected format
        return {
          avatar: userProfile.avatar || null,
          formData: {
            firstName: userProfile.firstName || "",
            lastName: userProfile.lastName || "",
            about: userProfile.about || "",
            pronouns: userProfile.pronouns || "",
            website: userProfile.website || "",
            username: userProfile.username || "",
            email: userProfile.email,
          },
        };
      }
  
      // Log a warning if the profile is not found
      console.warn("No profile found for the user.");
      return {
        avatar: null,
        formData: {
          firstName: "",
          lastName: "",
          about: "",
          pronouns: "",
          website: "",
          username: "",
        },
      };
    } catch (error) {
      console.error("Error fetching profile data:", error);
      throw error;
    }
  }, [session?.user?.email]);
  
  

  return {
    avatar,
    formData,
    handleAvatarChange,
    handleInputChange,
    resetForm,
    saveProfile,
    fetchProfileData,
  };
};