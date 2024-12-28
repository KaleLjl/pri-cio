'use client';

import Image from 'next/image';
import { useHistory } from '@/lib/hooks/useHistory';
import { useState } from 'react';
import { HistoryItem } from '@/lib/types/history';

interface DisplayHistoryProps {
  histories: HistoryItem[];
}

export default function DisplayHistory({ histories: initialHistories }: DisplayHistoryProps) {
  const { histories, isLoading, error, deleteHistory, postHistory } = useHistory(initialHistories);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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
        <div className="text-center py-10 text-gray-500">No history records found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {histories.map((history) => (
            <div
              key={history._id}
              className="relative bg-white rounded-lg shadow-md overflow-hidden group"
              onMouseLeave={() => setActiveDropdown(null)} // Close dropdown when hovering out of the card
            >
              <div className="relative h-80 w-full p-40">
                <Image
                  src={history.imageUrl}
                  alt={history.description || 'Product image'}
                  fill
                  className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={() => {
                    console.error(`Failed to load image: ${history.imageUrl}`);
                  }}
                />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === history._id ? null : history._id);
                    }}
                    className="text-white hover:text-gray-800"
                  >
                    •••
                  </button>
                  {activeDropdown === history._id && (
                    <div className="absolute right-0 mt-2 w-20 bg-white/50 shadow-lg rounded-lg p-2 backdrop-blur-sm border border-gray-300 z-10 transition-transform duration-200 ease-in-out">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistory(history._id);
                          setActiveDropdown(null);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-gray-100 rounded"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          postHistory(history); // Call the post function
                          setActiveDropdown(null);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-gray-100 rounded"
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-lg font-semibold text-green-400">
                    ${history.price || 'N/A'}
                  </p>
                  <p className="text-sm mt-1">{history.description || 'No description available'}</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {history.createdAt
                      ? new Date(history.createdAt).toLocaleString()
                      : 'Date not available'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}







