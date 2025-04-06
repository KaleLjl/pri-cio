import { useState, useCallback } from "react"; // Removed unused useEffect
import { useSession } from "next-auth/react";
import { UserProfile, UseProfilePage } from "../types/user"; // Corrected import path and type name

export const useProfilePage = (): UseProfilePage => {
  // Removed unused userId parameter
  // const [avatar, setAvatar] = useState<string | null>(null); // Removed base64 avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // Added state for File object
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // Keep for preview
  const { data: session } = useSession();
  // Use UserProfile type, initialize with potential null/undefined for dates
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    _id: undefined,
    name: "",
    about: "",
    website: "",
    avatarUrl: null,
    createdAt: undefined,
    updatedAt: undefined,
  });
  // Add state to track if avatar should be removed
  const [shouldRemoveAvatar, setShouldRemoveAvatar] = useState<boolean>(false);

  const handleAvatarChange = async (file: File) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      setAvatarUrl(objectUrl);

      // const reader = new FileReader(); // No longer needed as we don't read as base64
      // Store the file object instead of converting to base64
      setAvatarFile(file);
      // Clear the remove flag if a new file is selected
      setShouldRemoveAvatar(false);
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
      createdAt: undefined,
      updatedAt: undefined,
    });
    // setAvatar(null); // Removed
    setAvatarFile(null);
    setAvatarUrl(null);
    setShouldRemoveAvatar(false);
  };

  // Add function to explicitly clear/remove avatar
  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarUrl(null);
    setShouldRemoveAvatar(true); // Set flag to remove on save
    // Also update formData to reflect immediate UI change if needed
    setFormData((prev) => ({ ...prev, avatarUrl: null }));
  };

  const saveProfile = async () => {
    try {
      // Create FormData
      const dataToSend = new FormData();
      if (formData.name !== undefined) dataToSend.append("name", formData.name);
      if (formData.about !== undefined)
        dataToSend.append("about", formData.about);
      if (formData.website !== undefined)
        dataToSend.append("website", formData.website);

      // Append avatar file if it exists
      if (avatarFile) {
        dataToSend.append("avatar", avatarFile);
      } else if (shouldRemoveAvatar) {
        // Signal removal if flag is set and no new file is chosen
        dataToSend.append("removeAvatar", "true");
      }

      const response = await fetch(`/api/editprofile`, {
        method: "POST",
        // No Content-Type header needed for FormData
        body: dataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error details:", errorData);
        throw new Error("Failed to save profile");
      }

      const result = await response.json();
      console.log("Profile saved successfully!", result);

      setFormData((prev) => ({
        ...prev,
        avatarUrl: result.profile.avatarUrl, // Update avatarUrl from response
        updatedAt: result.profile.updatedAt
          ? new Date(result.profile.updatedAt)
          : undefined, // Update timestamp
      }));

      // Reset temporary states
      setAvatarFile(null);
      setShouldRemoveAvatar(false);
      alert("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile");
    }
  };

  // Fetch profile using the correct endpoint /api/users/me
  const fetchProfileData = useCallback(async (): Promise<UserProfile> => {
    try {
      const response = await fetch(`/api/users/me`); // Correct endpoint
      if (!response.ok) {
        console.error(`Failed to fetch profile data: ${response.statusText}`);
        // Return a default/empty profile structure matching UserProfile
        return {
          _id: "", // Or handle error differently
          name: "",
          about: "",
          website: "",
          avatarUrl: null,
          createdAt: undefined,
          updatedAt: undefined,
        };
      }

      const userProfile: UserProfile = await response.json();

      // Update state with fetched data
      setFormData({
        _id: userProfile._id,
        name: userProfile.name || "",
        about: userProfile.about || "",
        website: userProfile.website || "",
        avatarUrl: userProfile.avatarUrl || null,
        // Convert date strings back to Date objects if necessary, though service should return Date
        createdAt: userProfile.createdAt
          ? new Date(userProfile.createdAt)
          : undefined,
        updatedAt: userProfile.updatedAt
          ? new Date(userProfile.updatedAt)
          : undefined,
      });
      setAvatarUrl(userProfile.avatarUrl || null); // Update preview URL

      return userProfile;
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
    clearAvatar, // Added clearAvatar to return object
    resetForm,
    saveProfile,
    fetchProfileData,
  };
};
