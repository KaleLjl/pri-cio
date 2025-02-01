import { useState } from 'react';

export const useCreatePost = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([]);
  const [postData, setPostData] = useState<{ description: string; price: string } | null>(null);

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

      if (!data.detailedDescription) throw new Error('No description received from GPT');

      // Add GPT's response to the conversation
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: `Image analysis: ${data.detailedDescription}` },
      ]);

      // Update the post preview data if included in the response
      if (data.postData) {
        setPostData(data.postData);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    // Add the user's message to the conversation first
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
  
      if (!data.reply) throw new Error('No reply received from GPT');
  
      // Append GPT's reply to conversation
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
  
      // **Update Post Preview with structured description & price**
      if (data.postData && data.postData.description && data.postData.price) {
        setPostData({
          description: data.postData.description,
          price: data.postData.price,
        });
      }
  
      return data;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      return { reply: '', postData: null };
    }
  };
  

  const clearImage = () => {
    setSelectedImage(null);
    setErrorMessage(null);
    setConversation([]);
    setPostData(null);
  };

  return {
    selectedImage,
    isLoading,
    errorMessage,
    conversation,
    postData,
    uploadImage,
    analyzeImage,
    sendMessage,
    clearImage,
  };
};




