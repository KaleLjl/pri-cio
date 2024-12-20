'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const Explore = () => {
  // Mock data for the cards
  const cards = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    title: `Card Title ${i + 1}`,
    image: `/image-placeholder.jpg`,
    description: `This is the description for card ${i + 1}.`,
  }));

  const [isNight, setIsNight] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);

  // Determine if it is day or night based on the current time
  useEffect(() => {
    const hours = new Date().getHours();
    setIsNight(hours < 6 || hours >= 18); // Night time: before 6 AM or after 6 PM
  }, []);

  return (
    <div className={`min-h-screen ${isNight ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Header */}
      <div
        className={`text-center py-6 ${
          isNight ? 'bg-black border-b border-gray-700' : 'bg-white shadow-md'
        }`}
      >
      </div>

      {/* Grid Layout */}
      <div className="p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {cards.map((card) => (
          <div key={card.id} className="space-y-2">
            {/* Card */}
            <div
              className={`rounded-[2rem] overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-md ${
                isNight ? 'bg-gray-800' : 'bg-white'
              }`}
              onClick={() => setSelectedCard(card)}
            >
              <div className="relative w-full h-80">
                {/* Increased height here to make the card vertically longer */}
                <Image
                  src={card.image}
                  alt={card.title}
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
              <h2
                className={`text-sm font-medium ${
                  isNight ? 'text-white' : 'text-gray-800'
                }`}
              >
                {card.title}
              </h2>
              <p
                className={`text-xs ${
                  isNight ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {card.description}
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
            <h2 className="text-xl font-bold mb-4">{selectedCard.title}</h2>
            <Image
              src={selectedCard.image}
              alt={selectedCard.title}
              width={400}
              height={200}
              className="rounded-md mb-4"
            />
            <p className="text-gray-300">{selectedCard.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Explore;
