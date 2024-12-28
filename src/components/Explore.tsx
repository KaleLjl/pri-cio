'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useExplore } from '@/lib/hooks/useExplore';
import { ExploreItem } from '@/lib/types/explore';

interface DisplayExploreProps {
  explores: ExploreItem[];
}

export default function Explore({ explores: initialExplores }: DisplayExploreProps) {
  const { explores, isLoading, error, fetchExplorePosts } = useExplore(initialExplores);
  const [isNight, setIsNight] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ExploreItem | null>(null);

  // Determine if it is day or night based on the current time
  useEffect(() => {
    const hours = new Date().getHours();
    setIsNight(hours < 6 || hours >= 18); // Night time: before 6 AM or after 6 PM
  }, []);

  // Fetch posts when the component mounts
  useEffect(() => {
    fetchExplorePosts();
  }, [fetchExplorePosts]);

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (explores.length === 0) {
    return (
      <div className={`min-h-screen ${isNight ? 'bg-black text-white' : 'bg-gray-50 text-gray-800'}`}>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">No posts available</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isNight ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Header Spacer */}
      <div
        className={`py-6 ${isNight ? 'bg-black border-b border-gray-700' : 'bg-white shadow-md'}`}
      >
        {/* Empty spacer to preserve the header height */}
      </div>

      {/* Grid Layout */}
      <div className="p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {explores.map((explore) => (
          <div key={explore._id} className="space-y-2">
            {/* Card */}
            <div
              className={`rounded-[2rem] overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-md ${isNight ? 'bg-gray-800' : 'bg-white'}`}
              onClick={() => setSelectedCard(explore)}
            >
              <div className="relative w-full h-80">
                <Image
                  src={explore.imageUrl}
                  alt={`Post created on ${new Date(explore.createdAt).toLocaleString()}`}
                  layout="fill"
                  objectFit="cover"
                  placeholder="blur"
                  blurDataURL="/image-placeholder.jpg"
                  className="rounded-[2rem]"
                />
              </div>
            </div>
            {/* Text Below Card */}
            <div className="text-center">
              <p className={`text-sm font-medium ${isNight ? 'text-white' : 'text-gray-800'}`}>
                ${explore.price}
              </p>
              <p className={`text-xs ${isNight ? 'text-gray-400' : 'text-gray-600'}`}>
                {explore.description || 'No description available'}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(explore.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md relative text-white">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
              onClick={() => setSelectedCard(null)}
            >
              &times;
            </button>
            <p className="text-lg font-bold mb-4">${selectedCard.price}</p>
            <Image
              src={selectedCard.imageUrl}
              alt={`Post created on ${new Date(selectedCard.createdAt).toLocaleString()}`}
              width={400}
              height={200}
              className="rounded-md mb-4"
            />
            <p className="text-gray-300">{selectedCard.description || 'No description available'}</p>
            <p className="text-gray-400 text-sm mt-2">
              Created at: {new Date(selectedCard.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}




