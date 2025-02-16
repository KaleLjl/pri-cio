import { useState, useCallback } from 'react';

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

  const handleShareCardGeneration = useCallback(async (data: ShareCardData) => {
    try {
      const shareCardUrl = await generateShareCard({
        imageUrl: data.imageUrl,
        price: data.price,
        description: data.description,
        currency: data.currency
      }).catch(error => {
        console.error('Failed to generate share card:', {
          error: error.message,
          details: error,
          requestData: data
        });
        throw error;
      });

      // 创建下载链接并触发下载
      const link = document.createElement('a');
      link.href = shareCardUrl;
      link.download = 'pricio-share.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(shareCardUrl);

      return true;
    } catch (error) {
      console.error('Share card generation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }, []);

  return {
    isGenerating,
    error,
    generateShareCard,
    handleShareCardGeneration
  };
}