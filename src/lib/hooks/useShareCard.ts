import { useState } from 'react';

interface ShareCardData {
  imageUrl: string;
  price: string;
  description: string;
  currency: string;
}

export function useShareCard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShareCard = async (data: ShareCardData) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/share-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to generate share card');
      }

      // 创建 Blob URL
      const blob = await response.blob();
      const shareUrl = URL.createObjectURL(blob);
      
      return shareUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate share card';
      setError(errorMessage);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    error,
    generateShareCard
  };
}