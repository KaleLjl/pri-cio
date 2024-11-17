import { useState } from 'react';
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export const useImageCapture = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();

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

  // 上传图片到服务器
  const uploadImage = async () => {
    if (!selectedImage) return;
    if (!user) {
      alert('Please login first');
      return;
    }
    
    setIsLoading(true);
    try {
      // 首先调用后端API处理图片
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

      // 然后再保存到 Supabase
      const base64Data = selectedImage.split(',')[1];
      const { data, error } = await supabase
        .from('useruploads')
        .insert({
          user_id: user.email,
          image_data: base64Data
        })
        .select();

      if (error) throw error;
      return data;
      
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加删除图片函数
  const handleDeleteImage = () => {
    setSelectedImage(null);
  };

  return {
    selectedImage,
    isLoading,
    handleCamera,
    handlePhotoUpload,
    uploadImage,
    handleDeleteImage 
  };
};
 