import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';

export interface UploadImageProcessState {
  selectedImage: string | null;
}

export interface UploadImageProcessActions {
  uploadImageFromDevice: () => void;
  clearImage: () => void;
  processImage: (file: File) => Promise<string>;
}

export const useUploadImageProcess = (): [UploadImageProcessState, UploadImageProcessActions] => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const processImage = async (file: File): Promise<string> => {
    // 如果文件大小小于 1MB，直接返回
    if (file.size <= 1024 * 1024) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            resolve(result);
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
      return await imageCompression.getDataUrlFromFile(compressedFile);
    } catch (error) {
      console.error('Image compression failed:', error);
      // 如果压缩失败，返回原始图片
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            resolve(result);
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
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const processedImage = await processImage(file);
          setSelectedImage(processedImage);
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }
      document.body.removeChild(input);
    };
    
    input.click();
  }, []);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  return [
    { selectedImage },
    { uploadImageFromDevice, clearImage, processImage }
  ];
};
