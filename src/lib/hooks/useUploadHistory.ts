import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface HistoryRecord {
  upload_id: number;
  upload_time: string;
  image_data: string;
  price: number;
  description: string
}

const fetchHistory = async (user: User | null) => {
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('useruploads')
    .select('upload_id, upload_time, image_data, price, description')
    .eq('user_id', user.email)
    .order('upload_time', { ascending: false })
    .limit(20);
    
  if (error) throw error;
  
  return data?.map(record => ({
    ...record,
    image_data: decodeSupabaseHexToBase64(record.image_data)
  })) || [];
};

const decodeSupabaseHexToBase64 = (hexData: string): string => {
  try {
    const jsonString = Buffer.from(hexData.replace(/\\x/g, ''), 'hex').toString();
    const jsonData = JSON.parse(jsonString);
    const buffer = Buffer.from(jsonData.data, 'hex');
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error converting nested hex to base64:', error);
    return '';
  }
};

export function useUploadHistory(user: User | null) {
  const queryClient = useQueryClient();
  
  const { data: records = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['uploadHistory', user?.email],
    queryFn: () => fetchHistory(user),
    enabled: !!user,
    staleTime: 0,                    // 修改为0，使得每次都认为数据是陈旧的
    keepPreviousData: true,          
    refetchOnMount: 'always',        // 确保每次挂载都重新获取
    refetchOnWindowFocus: true,      
    refetchInterval: 1000 * 60,      
    refetchIntervalInBackground: false,
  });

  const { mutate: handleDelete, isPending: isDeleting } = useMutation({
    mutationFn: async (upload_id: number) => {
      const { error } = await supabase
        .from('useruploads')
        .delete()
        .eq('upload_id', upload_id);
      if (error) throw error;
    },
    onMutate: async (upload_id) => {
      await queryClient.cancelQueries({ 
        queryKey: ['uploadHistory', user?.email] 
      });
      const previousRecords = queryClient.getQueryData(['uploadHistory', user?.email]);
      queryClient.setQueryData(['uploadHistory', user?.email], (old: HistoryRecord[]) => 
        old?.filter(record => record.upload_id !== upload_id) || []
      );
      return { previousRecords };
    },
    onError: (err, variables, context) => {
      if (context?.previousRecords) {
        queryClient.setQueryData(['uploadHistory', user?.email], context.previousRecords);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['uploadHistory', user?.email] 
      });
    },
  });

  return { 
    records, 
    isLoading, 
    isFetching,
    isDeleting,
    handleDelete,
    refetch
  };
}