import { useState } from 'react';

export const useCreatePost = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([]);

  const uploadImage = (file: File) => {
    setSelectedImage(file);
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch('/api/createpost', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to analyze image');

      const data = await response.json();
      setResult(data);
      setConversation((prev) => [...prev, { role: 'assistant', content: data.detailedDescription }]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    // Add the new user message to the conversation
    const updatedConversation = [...conversation, { role: 'user', content: message }];
    setConversation(updatedConversation);

    try {
      const response = await fetch('/api/createpost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation: updatedConversation }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from API:', errorText);
        throw new Error('Failed to communicate with GPT');
      }

      const data = await response.json();
      setConversation((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResult(null);
    setErrorMessage(null);
    setConversation([]);
  };

  return {
    selectedImage,
    isLoading,
    result,
    errorMessage,
    conversation,
    uploadImage,
    analyzeImage,
    sendMessage,
    clearImage,
  };
};
