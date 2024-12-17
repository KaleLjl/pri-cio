'use client';

import { useState } from 'react';
import Image from 'next/image';

const Explore = () => {
  // Mock data for the cards
  const cards = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    title: `Card Title ${i + 1}`,
    image: `/image-placeholder.jpg`,
    description: `This is the description for card ${i + 1}.`,
  }));

  const [selectedCard, setSelectedCard] = useState<any | null>(null);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="text-center py-6 bg-white shadow-md">
        <h1 className="text-3xl font-bold text-gray-800">Explore</h1>
      </div>

      {/* Grid Layout */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-white shadow-lg rounded-lg overflow-hidden cursor-pointer hover:shadow-2xl transition"
            onClick={() => setSelectedCard(card)}
          >
            <div className="relative w-full h-48">
              <Image
                src={card.image}
                alt={card.title}
                layout="fill"
                objectFit="cover"
                placeholder="blur"
                blurDataURL="/image-placeholder.jpg"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-700">
                {card.title}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setSelectedCard(null)}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">{selectedCard.title}</h2>
            <Image
              src={selectedCard.image}
              alt={selectedCard.title}
              width={400}
              height={200}
              className="rounded-md mb-4"
            />
            <p className="text-gray-700">{selectedCard.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Explore;
