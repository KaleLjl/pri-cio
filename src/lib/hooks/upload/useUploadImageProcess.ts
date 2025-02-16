import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';

interface ImageItem {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface UploadImageProcessState {
  images: ImageItem[];
  primaryImage: string | null;
}

export interface UploadImageProcessActions {
  uploadImageFromDevice: () => void;
  clearImages: () => void;
  processImage: (file: File) => Promise<string>;
  setPrimaryImage: (id: string) => void;
  removeImage: (id: string) => void;
}

export const useUploadImageProcess = (): [UploadImageProcessState, UploadImageProcessActions] => {
  const [images, setImages] = useState<ImageItem[]>([]);

  const processImage = async (file: File): Promise<string> => {
    const ensureBase64Prefix = (base64String: string) => {
      if (!base64String.startsWith('data:image/')) {
        const mimeType = file.type || 'image/jpeg';
        return `data:${mimeType};base64,${base64String.replace(/^data:.*?;base64,/, '')}`;
      }
      return base64String;
    };

    // 如果文件大小小于 1MB，直接返回
    if (file.size <= 1024 * 1024) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            resolve(ensureBase64Prefix(result));
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // 压缩选项
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: false,
      initialQuality: 0.7
    };

    try {
      // 压缩图片
      const compressedFile = await imageCompression(file, options);
      // 转换为 base64
      const base64Data = await imageCompression.getDataUrlFromFile(compressedFile);
      return ensureBase64Prefix(base64Data);
    } catch (error) {
      console.error('Image compression failed:', error);
      // 如果压缩失败，返回原始图片
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            resolve(ensureBase64Prefix(result));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const uploadImageFromDevice = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // 允许多选
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        try {
          const newImages: ImageItem[] = [];
          for (let i = 0; i < files.length; i++) {
            const processedImage = await processImage(files[i]);
            newImages.push({
              id: `${Date.now()}-${i}`,
              url: processedImage,
              isPrimary: images.length === 0 && i === 0 // 第一张上传的图片设为主图
            });
          }
          
          setImages(prev => {
            const updatedImages = [...prev, ...newImages];
            // 如果没有主图，设置第一张为主图
            if (!updatedImages.some(img => img.isPrimary)) {
              updatedImages[0].isPrimary = true;
            }
            return updatedImages;
          });
        } catch (error) {
          console.error('Error processing images:', error);
        }
      }
      document.body.removeChild(input);
    };
    
    input.click();
  }, [images]);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  const setPrimaryImage = useCallback((id: string) => {
    setImages(prev => prev.map(img => ({
      ...img,
      isPrimary: img.id === id
    })));
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const updatedImages = prev.filter(img => img.id !== id);
      // 如果删除的是主图，且还有其他图片，则设置第一张为主图
      if (prev.find(img => img.id === id)?.isPrimary && updatedImages.length > 0) {
        updatedImages[0].isPrimary = true;
      }
      return updatedImages;
    });
  }, []);

  const primaryImage = images.find(img => img.isPrimary)?.url || null;

  return [
    { images, primaryImage },
    { uploadImageFromDevice, clearImages, processImage, setPrimaryImage, removeImage }
  ];
};
