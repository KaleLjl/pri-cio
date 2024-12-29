'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useExplore } from '@/lib/hooks/useExplore';
import { ExploreItem } from '@/lib/types/explore';
// ********************************************************************************************************  
import { useSearchParams } from 'next/navigation';
// ********************************************************************************************************  

interface DisplayExploreProps {
  explores: ExploreItem[];
}

export default function Explore({ explores: initialExplores }: DisplayExploreProps) {
  const { explores, isLoading, error, fetchExplorePosts } = useExplore(initialExplores);
  const [selectedCard, setSelectedCard] = useState<ExploreItem | null>(null);

  // ********************************************************************************************************  
  const [filteredExplores, setFilteredExplores] = useState<ExploreItem[]>([]);
  const searchParams = useSearchParams(); // Get the search query from the URL
  const searchQuery = searchParams?.get('search') || ''; // Extract or default to an empty string
  // ********************************************************************************************************  

  // Fetch posts when the component mounts
  useEffect(() => {
    fetchExplorePosts();
  }, [fetchExplorePosts]);

  // ********************************************************************************************************  
  // Filter posts based on the search query
  useEffect(() => {
    if (!searchQuery) {
      // If no search query, display all posts
      setFilteredExplores(explores);
    } else {
      // Filter posts by matching the description (case-insensitive)
      const filtered = explores.filter((explore) =>
        explore.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredExplores(filtered);
    }
  }, [explores, searchQuery]);
  // ********************************************************************************************************  

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (filteredExplores.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Sorry, no posts found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header Spacer */}
      <div className="py-6 bg-black border-b border-gray-700">
        {/* Empty spacer to preserve the header height */}
      </div>
      {/* Grid Layout */}
      <div className="p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
    
        {/********************************************************************************************************** */}
        {/* {explores.map((explore) => ( */}
        {filteredExplores.map((explore) => (
        // ********************************************************************************************************  

          <div key={explore._id} className="space-y-2">
            {/* Card */}
            <div
              className="rounded-[2rem] overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-md bg-gray-800"
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
              <p className="text-sm font-medium text-white">
                ${explore.price}
              </p>
              <p className="text-xs text-gray-400">
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




