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
  handleExport: () => Promise<void>;
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
  const handleExport = useCallback(async () => {
    try {
      uiActions.stopEditing();
      if (!imageState.selectedImage) {
        throw new Error('No image selected');
      }

      const [shareCardUrl] = await Promise.all([
        generateShareCard({
          imageUrl: imageState.selectedImage,
          price: metaState.price,
          description: metaState.description,
          currency: metaState.currency
        }).catch(error => {
          console.error('Failed to generate share card:', {
            error: error.message,
            details: error,
            requestData: {
              imageUrl: imageState.selectedImage,
              price: metaState.price,
              description: metaState.description,
              currency: metaState.currency
            }
          });
          throw error;
        }),
        saveToHistory(
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
        })
      ]);

      const link = document.createElement('a');
      link.href = shareCardUrl;
      link.download = 'pricio-share.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(shareCardUrl);
    } catch (error) {
      console.error('Export operation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }, [imageState.selectedImage, metaState.price, metaState.description, metaState.currency, generateShareCard, saveToHistory, uiActions]);

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
    handleExport,
    handleAnalyzeImage,
    handleClearAll,
    handlePriceChange,
    handleDescriptionChange,
  };
}; 