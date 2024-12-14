import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';

export const useImageCapture = () => {
  // 状态管理
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<string>('USD');

  // 处理图片上传
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

  // 使用AI处理图片
  const analyzeImageWithAI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedImage,
          currency
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      setDescription(data.description);
      setPrice(data.price.toString());
    } catch (error) {
      console.error('Error analyzing image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除已选择的图片和相关信息
  const clearImageAndData = () => {
    setSelectedImage(null);
    setPrice('');
    setDescription('');
  };

  // 导出图片为PNG文件
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
      console.error('Export failed:', error);
      alert('Failed to export image');
    }
  };

  // 处理点击编辑区域外的事件
  const closeEditModeOnOutsideClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const exportContent = document.getElementById('export-content');
    
    if (isEditing && exportContent && !exportContent.contains(target)) {
      setIsEditing(false);
    }
  };

  return {
    selectedImage,
    isLoading,
    isEditing,
    setIsEditing,
    uploadImageFromDevice,
    analyzeImageWithAI,
    clearImageAndData,
    setPrice,
    price,
    setDescription,
    description,
    exportAsImage,
    closeEditModeOnOutsideClick,
    currency,
    setCurrency,
  };
}
 