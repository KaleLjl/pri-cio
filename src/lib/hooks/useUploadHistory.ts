import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface HistoryRecord {
  upload_id: number;
  upload_time: string;
  image_data: string;
  price: number;
  description: string
}

export function useUploadHistory(user: User | null) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

const decodeSupabaseHexToBase64 = (hexData: string): string => {
  try {
    // 第一步：解码外层的十六进制 JSON 字符串
    const jsonString = Buffer.from(hexData.replace(/\\x/g, ''), 'hex').toString();
    // 第二步：解析 JSON 获取内部的十六进制数据
    const jsonData = JSON.parse(jsonString);
    // 第三步：将内部的十六进制数据转换为 二进制
    const buffer = Buffer.from(jsonData.data, 'hex');
    // 添加 base64 图片前缀
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error converting nested hex to base64:', error);
    return '';
  }
};

  const fetchHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('useruploads')
        .select('upload_id, upload_time, image_data, price, description')
        .eq('user_id', user.email)
        .order('upload_time', { ascending: false })
        .limit(20);
      if (error) throw error;
      
      // 转换每条记录中的图片数据为 Base64 格式
      const formattedData = data?.map(record => ({
        ...record,
        image_data: decodeSupabaseHexToBase64(record.image_data)
      })) || [];

      setRecords(formattedData);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (upload_id: number) => {
    setIsDeleting(upload_id);
    setRecords(prev => prev.filter(record => record.upload_id !== upload_id));

    try {
      const { error } = await supabase
        .from('useruploads')
        .delete()
        .eq('upload_id', upload_id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting record:', error);
      fetchHistory();
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  return { records, isLoading, isDeleting, handleDelete };
}