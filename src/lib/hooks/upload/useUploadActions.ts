import { useCallback, useState } from 'react';
import { UploadMetaDataState, UploadMetaDataActions } from './useUploadMetaData';
import { UploadImageProcessState, UploadImageProcessActions } from './useUploadImageProcess';
import { UploadUIActions } from './useUploadUI';
import { UploadAIActions } from './useUploadAI';

interface UseUploadActionsParams {
  metaState: UploadMetaDataState;
  metaActions: UploadMetaDataActions;
  imageState: UploadImageProcessState;
  imageActions: UploadImageProcessActions;
  uiActions: UploadUIActions;
  aiActions: UploadAIActions;
  saveToHistory: (price: string, description: string, images: { id: string; url: string; isPrimary: boolean; }[], currency: string) => Promise<void>;
  generateShareCard: (params: { imageUrl: string; price: string; description: string; currency: string; }) => Promise<string>;
}

export interface UploadActions {
  handleToHistory: () => Promise<void>;
  handleAnalyzeImage: () => Promise<void>;
  handleClearAll: () => void;
  handlePriceChange: (value: string) => void;
  handleDescriptionChange: (value: string) => void;
  toastState: {
    showToast: boolean;
    toastMessage: string;
    toastType: 'success' | 'error' | 'info';
    setShowToast: React.Dispatch<React.SetStateAction<boolean>>;
  };
  handleChatAISuccess: (description: string, price: string) => void;
}

export const useUploadActions = ({
  metaState,
  metaActions,
  imageState,
  imageActions,
  uiActions,
  aiActions,
  saveToHistory,
  generateShareCard,
}: UseUploadActionsParams): UploadActions => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showNewToast = (message: string, type: 'success' | 'error' | 'info') => {
    setShowToast(false);
    setTimeout(() => {
      setToastMessage(message);
      setToastType(type);
      setShowToast(true);
    }, 100);
  };

  const handleToHistory = useCallback(async () => {
    try {
      showNewToast('Uploading...', 'info');
      uiActions.stopEditing();
      if (!imageState.images.length) {
        throw new Error('No image selected');
      }

      await saveToHistory(
        metaState.price, 
        metaState.description, 
        imageState.images,
        metaState.currency
      ).catch(error => {
        console.error('Failed to save to history:', {
          error: error.message,
          details: error,
          requestData: {
            price: metaState.price,
            description: metaState.description,
            images: imageState.images,
            currency: metaState.currency
          }
        });
        throw error;
      });

      showNewToast('Successfully uploaded!', 'success');
      handleClearAll();
    } catch (error) {
      showNewToast(
        error instanceof Error ? error.message : 'Failed to upload',
        'error'
      );
    }
  }, [imageState.images, metaState.price, metaState.description, metaState.currency, saveToHistory, uiActions]);

  const handleAnalyzeImage = useCallback(async () => {
    await aiActions.analyzeImageWithAI(
      imageState.primaryImage,
      metaState.currency,
      (description, price) => {
        metaActions.setDescription(description);
        metaActions.setPrice(price);
      }
    );
  }, [imageState.primaryImage, metaState.currency, aiActions, metaActions]);

  const handleClearAll = useCallback(() => {
    imageActions.clearImages();
    metaActions.resetMetaData();
    uiActions.stopEditing();
  }, [imageActions, metaActions, uiActions]);

  const handlePriceChange = useCallback((value: string) => {
    if (metaActions.validatePrice(value)) {
      metaActions.setPrice(value);
    }
  }, [metaActions]);

  const handleDescriptionChange = useCallback((value: string) => {
    if (value.length <= 100) {
      metaActions.setDescription(value);
    }
  }, [metaActions]);

  const handleChatAISuccess = useCallback((description: string, price: string) => {
    metaActions.setDescription(description);
    metaActions.setPrice(price);
    showNewToast('AI analysis completed successfully!', 'success');
  }, [metaActions]);

  return {
    handleToHistory,
    handleAnalyzeImage,
    handleClearAll,
    handlePriceChange,
    handleDescriptionChange,
    toastState: {
      showToast,
      toastMessage,
      toastType,
      setShowToast
    },
    handleChatAISuccess,
  };
}; 