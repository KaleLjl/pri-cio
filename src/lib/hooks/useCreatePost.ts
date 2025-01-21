import { useState } from 'react';

export const useImageCaptureGoogle = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadImage = (file: File) => {
    setSelectedImage(file);
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch('/api/google', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to analyze image');

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResult(null);
    setErrorMessage(null);
  };

  return {
    selectedImage,
    isLoading,
    result,
    errorMessage,
    uploadImage,
    analyzeImage,
    clearImage,
  };
};
