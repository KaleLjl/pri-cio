import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import Webcam from 'react-webcam';
import html2canvas from 'html2canvas';

export const useImageCapture = () => {
  // 状态管理
  const [selectedImage, setSelectedImage] = useState<string | null>(null);  // 存储选中的图片
  const [isLoading, setIsLoading] = useState<boolean>(false);              // 加载状态
  const [isEditing, setIsEditing] = useState<boolean>(false);              // 编辑状态
  const [showCamera, setShowCamera] = useState(false);                     // 相机显示状态
  const { user } = useAuth();                                            // 用户信息
  const [description, setDescription] = useState('');                      // 商品描述
  const [price, setPrice] = useState('');                                 // 商品价格
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // 将图片和相关信息保存到Supabase
  const saveImageDataToDatabase = async (data: { description: string, price: string }) => {
    if (!selectedImage || !user) return;
    
    setIsLoading(true);
    
    try {
      const base64Data = selectedImage.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Buffer.from(base64Data, 'base64');
  
      const { data: savedData, error } = await supabase
        .from('useruploads')
        .insert({
          user_id: user.email,
          image_data: binaryData,
          price: Number(data.price),
          description: data.description
        })
        .select();
  
      if (error) throw error;
      
      alert('Successfully saved!');
      setIsEditing(false);
      
      return savedData;
    } catch (error) {
      alert('Failed to save: ' + (error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 使用AI处理图片，获取描述和价格建议
  const analyzeImageWithAI = async () => {
    if (!selectedImage || !user) {
      alert('Please login first');
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
      console.error('Upload failed:', error);
      throw error;
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

  // 导出图片和信息为PNG文件
  // 同时保存数据到Supabase
  const exportAndSaveAsImage = async () => {
    try {
      const element = document.getElementById('export-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        useCORS: true,     // 允许跨域图片
        scale: 2,          // 提高清晰度
        backgroundColor: null,         // 透明背景
        imageTimeout: 0,              // 图片加载超时时间
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'price-details.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
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
    saveImageDataToDatabase,
    setPrice,
    price,
    setDescription,
    description,
    exportAndSaveAsImage,
    closeEditModeOnOutsideClick,
    webcamRef,
  };
}
 