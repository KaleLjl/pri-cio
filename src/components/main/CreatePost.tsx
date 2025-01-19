'use client';

import React, { useState } from 'react';

type ChatMessage = {
  sender: 'user' | 'gpt';
  text: string;
};

export default function CreatePost() {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isImageUploaded, setIsImageUploaded] = useState(false);
  const [description, setDescription] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newImages = files.map((file) => URL.createObjectURL(file));
    setUploadedImages([...uploadedImages, ...newImages]);
    setIsImageUploaded(true);
  };

  const handleSendMessage = () => {
    if (!description.trim()) return;

    const newMessage: ChatMessage = { sender: 'user', text: description };
    setChatMessages((prev) => [...prev, newMessage]);
    setDescription('');

    // Simulate GPT response (replace this with actual API call)
    setTimeout(() => {
      const gptResponse: ChatMessage = {
        sender: 'gpt',
        text: `Thanks for sharing the description. Can you provide more details, such as the condition of the item and whether there is any damage?`,
      };
      setChatMessages((prev) => [...prev, gptResponse]);
    }, 1000);
  };

  if (!isImageUploaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="border border-dashed border-purple-500 p-8 rounded-lg text-center">
          <h2 className="text-lg font-semibold mb-4">Upload Images</h2>
          <input
            type="file"
            multiple
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-700"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Describe Your Item</h1>

      {/* Image Preview Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Uploaded Images</h2>
        <div className="grid grid-cols-3 gap-4">
          {uploadedImages.map((src, index) => (
            <div key={index} className="relative w-32 h-32 border rounded-md overflow-hidden">
              <img src={src} alt={`Uploaded ${index}`} className="object-cover w-full h-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Chat Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Chat with GPT</h2>
        <div className="p-4 bg-gray-800 rounded-md mb-4 max-h-64 overflow-y-auto">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`mb-2 ${msg.sender === 'gpt' ? 'text-purple-500' : 'text-white'}`}>
              <strong>{msg.sender === 'gpt' ? 'GPT' : 'You'}:</strong> {msg.text}
            </div>
          ))}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a brief description of the item you are selling..."
          className="w-full p-2 rounded-md bg-gray-800 border border-gray-600 text-white focus:ring-purple-500 mb-2"
        ></textarea>
        <button
          onClick={handleSendMessage}
          className="w-full py-3 bg-purple-500 text-white font-semibold rounded-md hover:bg-purple-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}



