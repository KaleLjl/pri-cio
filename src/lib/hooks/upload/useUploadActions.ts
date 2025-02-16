import { useCallback } from 'react';
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
  saveToHistory: (price: string, description: string, imageUrl: string, currency: string) => Promise<void>;
  generateShareCard: (params: { imageUrl: string; price: string; description: string; currency: string; }) => Promise<string>;
}

export interface UploadActions {
  handleToHistory: () => Promise<void>;
  handleAnalyzeImage: () => Promise<void>;
  handleClearAll: () => void;
  handlePriceChange: (value: string) => void;
  handleDescriptionChange: (value: string) => void;
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
  const handleToHistory = useCallback(async () => {
    try {
      uiActions.stopEditing();
      if (!imageState.selectedImage) {
        throw new Error('No image selected');
      }

      await saveToHistory(
        metaState.price, 
        metaState.description, 
        imageState.selectedImage,
        metaState.currency
      ).catch(error => {
        console.error('Failed to save to history:', {
          error: error.message,
          details: error,
          requestData: {
            price: metaState.price,
            description: metaState.description,
            imageUrl: imageState.selectedImage,
            currency: metaState.currency
          }
        });
        throw error;
      });

    } catch (error) {
      console.error('Save to history operation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }, [imageState.selectedImage, metaState.price, metaState.description, metaState.currency, saveToHistory, uiActions]);

  const handleAnalyzeImage = useCallback(async () => {
    await aiActions.analyzeImageWithAI(
      imageState.selectedImage,
      metaState.currency,
      (description, price) => {
        metaActions.setDescription(description);
        metaActions.setPrice(price);
      }
    );
  }, [imageState.selectedImage, metaState.currency, aiActions, metaActions]);

  const handleClearAll = useCallback(() => {
    imageActions.clearImage();
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

  return {
    handleToHistory,
    handleAnalyzeImage,
    handleClearAll,
    handlePriceChange,
    handleDescriptionChange,
  };
}; 