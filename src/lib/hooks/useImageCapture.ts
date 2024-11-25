import { useState } from 'react';
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export const useImageCapture = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  //拍照上传图片
  const handleCamera = async () => {
    //这个函数捕获图片后,并把图片贴在了canvas上
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true }); //若是用户允许,则返回视频流
      // 创建视频元素
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // 创建canvas捕获图片 , 把视频流的一帧转换成图片
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);

      // 转换为base64
      const imageData = canvas.toDataURL('image/jpeg');
      setSelectedImage(imageData);

      // 停止视频流
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera access failed:', error);
    }
  };
  //从相册中选择上传图片
  const handlePhotoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // 将文件转换为base64
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file); //把文件转换成base64
      }
    };
    input.click();
  };



  const saveImageToSupabase = async (data: { description: string, price: string }) => {
    if (!selectedImage || !user) return;
    
    // 转换base64为二进制
    const base64Data = selectedImage.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Buffer.from(base64Data, 'base64');

    const { data: savedData, error } = await supabase
      .from('useruploads')
      .insert({
        user_id: user.email,
        image_data: binaryData, // 存储二进制数据
        price: Number(data.price),
        description: data.description
      })
      .select();

    if (error) throw error;
    return savedData;
  };
  const processImage = async () => {
    if (!selectedImage || !user) {
      alert('Please login first');
      return;
    }
    
    setIsLoading(true);
    try {
      // 调用后端API处理图片
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

  // 添加删除图片函数
  const handleDeleteImage = () => {
    setSelectedImage(null);
    setPrice('');
    setDescription('');
  };

  return {
    selectedImage,
    isLoading,
    handleCamera,
    handlePhotoUpload,
    processImage,
    handleDeleteImage,
    saveImageToSupabase,
    price,
    description
  };
};
 