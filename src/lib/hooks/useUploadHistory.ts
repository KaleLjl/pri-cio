import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface HistoryRecord {
  upload_id: number;
  upload_time: string;
  image_data: string;
  user_id: string;
}

export function useUploadHistory(user: User | null) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const fetchHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('useruploads')
        .select('upload_id, upload_time, image_data')
        .eq('user_id', user.email)
        .order('upload_time', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const formattedData = data?.map(record => ({
        ...record,
        image_data: record.image_data.startsWith('data:image') 
          ? record.image_data 
          : `data:image/jpeg;base64,${record.image_data}`
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