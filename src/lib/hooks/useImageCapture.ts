import { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import html2canvas from 'html2canvas';

export const useImageCapture = () => {
  // 状态管理
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const webcamRef = useRef<Webcam>(null);

  //  打开相机界面
  const openCameraView = () => {
    setShowCamera(true);
  };

  // 处理相机拍照后的图片
  const captureAndSaveImage = () => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setSelectedImage(imageSrc);
      setShowCamera(false);
    }
  };

  // 处理图片上传
  // 创建隐藏的文件输入框并触发点击事件
  const uploadImageFromDevice = () => {
    // 创建新的input元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    // 添加样式确保input是隐藏的
    input.style.display = 'none';
    document.body.appendChild(input);  // 添加到DOM中
    
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
      // 清理DOM
      document.body.removeChild(input);
    };
    
    // 触发点击
    input.click();
  };

  // 使用AI处理图片，获取描述和价格建议
  const analyzeImageWithAI = async () => {
    if (!selectedImage) {
      alert('Please select an image first');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedImage })
      });
  
      if (!response.ok) {
        throw new Error('Failed to process image');
      }
  
      const data = await response.json();
      
      if (!data.description || !data.price) {
        throw new Error('Failed to get description or price');
      }
  
      setDescription(data.description);
      setPrice(data.price);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze image');
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

  // 处理点击编辑区域外的事件 用于关闭编辑模式
  const closeEditModeOnOutsideClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (isEditing && 
        !target.closest('textarea') && 
        !target.closest('input') && 
        !target.matches('.text-lg.text-gray-600') && 
        !target.matches('.text-2xl.font-semibold.text-purple-600')) {
      setIsEditing(false);
    }
  };

  return {
    selectedImage,
    isLoading,
    isEditing,
    showCamera,
    setShowCamera,
    setIsEditing,
    openCameraView,
    captureAndSaveImage,
    uploadImageFromDevice,
    analyzeImageWithAI,
    clearImageAndData,
    setPrice,
    price,
    setDescription,
    description,
    exportAsImage,
    closeEditModeOnOutsideClick,
    webcamRef,
  };
}
 