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



  const convertHeicToJpeg = async (blob: Blob): Promise<Blob> => {
    try {
      console.log('Checking image type:', blob.type);
      if (blob.type === 'image/heic' || blob.type === 'image/heif') {
        console.log('Converting HEIC/HEIF to JPEG...');
        const convertedBlob = await heic2any({
          blob,
          toType: 'image/jpeg',
          quality: 0.8
        });
        return convertedBlob as Blob;
      }
      return new File([blob], "original.jpg", { type: blob.type });
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw error;
    }
  };

  const compressImageIfNeeded = async (blob: Blob): Promise<Blob> => {
    console.log('Original size:', (blob.size / 1024 / 1024).toFixed(2) + 'MB');
    
    if (blob.size > 1 * 1024 * 1024) {
      console.log('Starting compression...');
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: false,
        initialQuality: 0.7
      };
      
      try {
        const file = new File([blob], "compressed.jpg", { type: 'image/jpeg' });
        console.log('Pre-compression size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
        
        let compressedBlob;
        try {
          compressedBlob = await imageCompression(file, options);
          console.log('Post-compression size:', (compressedBlob.size / 1024 / 1024).toFixed(2) + 'MB');
          console.log('Compression ratio:', ((1 - compressedBlob.size / file.size) * 100).toFixed(1) + '%');
        } catch (compressionError) {
          console.error('Compression operation failed:', compressionError);
          return blob;
        }

        return compressedBlob;
      } catch (error) {
        console.error('Overall compression process failed:', error);
        return blob;
      }
    }
    
    return blob;
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
      const initialBlob = await (await fetch(selectedImage)).blob();

      
      // Step 2: Convert HEIC to JPEG if needed
      const heicProcessed = await convertHeicToJpeg(initialBlob);
      
      // Step 3: Compress if needed
      const finalProcessed = await compressImageIfNeeded(heicProcessed);
      
      // Convert final blob back to base64 for API request
      const finalBase64 = await imageCompression.getDataUrlFromFile(new File([finalProcessed], "processed.jpg", { type: finalProcessed.type }));
      
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedImage: finalBase64, currency }),
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
 