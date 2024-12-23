import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import heic2any from 'heic2any';

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
  closeErrorModal: () => void;
}

export const useImageCapture = (): [ImageCaptureState, ImageCaptureActions] => {
  // 状态管理
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEditing, setIsEditingState] = useState<boolean>(false);
  const [description, setDescriptionState] = useState('');
  const [price, setPriceState] = useState('');
  const [currency, setCurrencyState] = useState<string>('USD');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const convertHeicToJpeg = async (blob: Blob): Promise<string> => {
    try {
      if (blob.type === 'image/heic' || blob.type === 'image/heif') {
        console.log('Converting HEIC/HEIF to JPEG...');
        const convertedBlob = await heic2any({
          blob,
          toType: 'image/jpeg',
          quality: 0.8
        });
        return await imageCompression.getDataUrlFromFile(convertedBlob as File);
      }
      return await imageCompression.getDataUrlFromFile(new File([blob], "original.jpg", { type: blob.type }));
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw error;
    }
  };

  const compressImageIfNeeded = async (imageDataUrl: string): Promise<string> => {
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    
    console.log('Checking image size:', (blob.size / 1024 / 1024).toFixed(2) + 'MB');
    
    if (blob.size > 4.5 * 1024 * 1024) {
      console.log('Image size before compression:', (blob.size / 1024 / 1024).toFixed(2) + 'MB');
      const options = {
        maxSizeMB: 4,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      
      try {
        const compressedBlob = await imageCompression(new File([blob], "compressed.jpg", { type: blob.type }), options);
        console.log('Image size after compression:', (compressedBlob.size / 1024 / 1024).toFixed(2) + 'MB');
        return await imageCompression.getDataUrlFromFile(compressedBlob);
      } catch (error) {
        console.error('Image compression failed:', error);
        return imageDataUrl;
      }
    }
    
    return imageDataUrl;
  };

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
      if (!selectedImage) {
        throw new Error('No image selected');
      }

      // Step 1: Convert base64 to blob for HEIC check
      const initialResponse = await fetch(selectedImage);
      const initialBlob = await initialResponse.blob();
      
      // Step 2: Convert HEIC to JPEG if needed
      const heicProcessed = await convertHeicToJpeg(initialBlob);
      
      // Step 3: Compress if needed
      const finalProcessed = await compressImageIfNeeded(heicProcessed);
      
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedImage: finalProcessed, currency }),
      });

      if (!response.ok) throw new Error('Failed to analyze image');

      const data = await response.json();
      if (!data.description || !data.price) {
        throw new Error('Unable to analyze this image. Please try another one.');
      }

      setDescriptionState(data.description);
      setPriceState(data.price.toString());
    } catch (error) {
      console.error('Analysis error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to analyze this image');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const clearImageAndData = () => {
    setSelectedImage(null);
    setPriceState('');
    setDescriptionState('');
  };

  const closeErrorModal = useCallback(() => {
    setShowErrorModal(false);
    setErrorMessage('');
  }, []);

  // 使用 useCallback 记忆化 actions
  const setIsEditing = useCallback((value: boolean) => {
    setIsEditingState(value);
  }, []);

  const setPrice = useCallback((value: string) => {
    setPriceState(value);
  }, []);

  const setDescription = useCallback((value: string) => {
    setDescriptionState(value);
  }, []);

  const setCurrency = useCallback((value: string) => {
    setCurrencyState(value);
  }, []);
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
   {setIsEditing,
    setPrice,
    setDescription,
    setCurrency,
    uploadImageFromDevice,
    analyzeImageWithAI,
    clearImageAndData,
    closeErrorModal,}
  ];
};
 