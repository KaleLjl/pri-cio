'use client';

import Image from 'next/image';
import { useHistory } from '@/lib/hooks/useHistory';
import { HistoryItem } from '@/lib/types/history';

interface DisplayHistoryProps {
  histories: HistoryItem[];
}

export default function DisplayHistory({ histories: initialHistories }: DisplayHistoryProps) {
  const { 
    histories, 
    isLoading, 
    error, 
    deleteHistory 
  } = useHistory(initialHistories);

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">History</h1>
      
      {histories.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No history records found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {histories.map((history) => (
            <div key={history._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48 w-full">
                {history.imageUrl ? (
                  <Image
                    src={history.imageUrl}
                    alt={history.description || 'Product image'}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onError={() => {
                      console.error(`Failed to load image: ${history.imageUrl}`);
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100">
                    <span className="text-gray-400">No image available</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xl font-semibold text-purple-600">
                  ${history.price || 'N/A'}
                </p>
                <p className="text-gray-600 mt-2">
                  {history.description || 'No description available'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {history.createdAt ? new Date(history.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Date not available'}
                </p>
                <button
                  onClick={() => deleteHistory(history._id)}
                  className="mt-4 text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}