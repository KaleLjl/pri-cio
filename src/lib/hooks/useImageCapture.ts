import { useState } from 'react';
import html2canvas from 'html2canvas';

interface ImageCaptureState {
  selectedImage: string | null;
  isLoading: boolean;
  isEditing: boolean;
  description: string;
  price: string;
  currency: string;
  showErrorModal: boolean;
  errorMessage: string;
}

interface ImageCaptureActions {
  setIsEditing: (value: boolean) => void;
  setPrice: (value: string) => void;
  setDescription: (value: string) => void;
  setCurrency: (value: string) => void;
  uploadImageFromDevice: () => void;
  analyzeImageWithAI: () => Promise<void>;
  clearImageAndData: () => void;
  exportAsImage: () => Promise<void>;
  closeErrorModal: () => void;
}

export const useImageCapture = (): [ImageCaptureState, ImageCaptureActions] => {
  // 状态管理
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<string>('USD');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 业务逻辑
  const uploadImageFromDevice = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            setSelectedImage(result);
          }
        };
        reader.readAsDataURL(file);
      }
      document.body.removeChild(input);
    };
    
    input.click();
  };

  const analyzeImageWithAI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedImage, currency }),
      });

      if (!response.ok) throw new Error('Failed to analyze image');

      const data = await response.json();
      if (!data.description || !data.price) {
        throw new Error('Unable to analyze this image. Please try another one.');
      }

      setDescription(data.description);
      setPrice(data.price.toString());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to analyze this image');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const clearImageAndData = () => {
    setSelectedImage(null);
    setPrice('');
    setDescription('');
  };

  const exportAsImage = async () => {
    try {
      const element = document.getElementById('export-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        imageTimeout: 0,
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'price-details.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      setErrorMessage('Failed to export image');
      setShowErrorModal(true);
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  return [
    // 状态
    {
      selectedImage,
      isLoading,
      isEditing,
      description,
      price,
      currency,
      showErrorModal,
      errorMessage,
    },
    // 动作
    {
      setIsEditing,
      setPrice,
      setDescription,
      setCurrency,
      uploadImageFromDevice,
      analyzeImageWithAI,
      clearImageAndData,
      exportAsImage,
      closeErrorModal,
    }
  ];
};
 