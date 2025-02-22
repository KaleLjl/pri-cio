import { useState, useCallback } from 'react';

interface Message {
  role: string;
  content: string;
}

export interface UploadAIState {
  isLoading: boolean;
  showErrorModal: boolean;
  errorMessage: string | null;
}

export interface UploadAIActions {
  analyzeImageWithAI: (imageUrl: string | null, currency: string, onSuccess: (description: string, price: string) => void) => Promise<void>;
  closeErrorModal: () => void;
}

export const useUploadAI = (): [UploadAIState, UploadAIActions] => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analyzeImageWithAI = useCallback(async (
    imageUrl: string | null, 
    currency: string,
    onSuccess: (description: string, price: string) => void
  ) => {
    setIsLoading(true);
    try {
      if (!imageUrl) {
        throw new Error('No image selected');
      }

      const response = await fetch('/api/ai/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedImage: imageUrl, currency }),
      });

      if (!response.ok) throw new Error('Failed to analyze image');

      const data = await response.json();
      if (!data.description || !data.price) {
        throw new Error('Unable to analyze this image. Please try another one.');
      }

      onSuccess(data.description, data.price.toString());
    } catch (error) {
      console.error('Analysis error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to analyze this image');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeErrorModal = useCallback(() => {
    setShowErrorModal(false);
    setErrorMessage(null);
  }, []);

  return [
    { isLoading, showErrorModal, errorMessage },
    { analyzeImageWithAI, closeErrorModal }
  ];
};
