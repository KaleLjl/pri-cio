"use client";

import React, { useState } from "react";
import { useCreatePost } from "@/lib/hooks/useCreatePost";
import Loading from "@/components/shared/Loading";

const CreatePostPage = () => {
  const {
    selectedImage,
    isLoading,
    errorMessage,
    conversation,
    uploadImage,
    analyzeImage,
    sendMessage,
    clearImage,
  } = useCreatePost();

  const [messageInput, setMessageInput] = useState("");
  const [postData, setPostData] = useState<{ description: string; price: string } | null>(null);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    await sendMessage(messageInput).then((result: { reply: string; postData: any }) => {
      if (result.postData) {
        setPostData(result.postData);
      }
      setMessageInput("");
    });
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col pt-20 pb-8">
      {/* Main Container */}
      <div className="flex-grow overflow-y-auto px-6">
        <div className="max-w-7xl mx-auto w-full relative">
          {isLoading && (
            <div className="absolute inset-0 z-50">
              <Loading text="Analyzing..." />
            </div>
          )}

          {/* Three-Column Layout */}
          <div className="flex gap-6">
            {/* Left Column: Image Upload */}
            <div className="w-1/3 flex flex-col items-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadImage(file);
                  }
                }}
                className="hidden"
                id="imageInput"
              />
              <label
                htmlFor="imageInput"
                className="block w-96 h-96 border-2 border-dashed border-gray-300 rounded-lg 
                           hover:border-purple-500 transition-colors cursor-pointer 
                           flex items-center justify-center"
              >
                {selectedImage ? (
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Selected"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="mt-2 text-gray-500 block">Click to upload an image</span>
                  </div>
                )}
              </label>

              {/* Analyze & Clear Buttons */}
              <div className="flex gap-4 mt-4">
                <button
                  onClick={analyzeImage}
                  disabled={isLoading || !selectedImage}
                  className={`py-3 px-6 rounded-md font-semibold ${
                    isLoading || !selectedImage
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-purple-500 text-white hover:bg-purple-700"
                  }`}
                >
                  {isLoading ? "Analyzing..." : "Analyze Image"}
                </button>
                <button
                  onClick={() => {
                    clearImage();
                    setPostData(null); // Clears Post Preview Box
                  }}
                  disabled={isLoading}
                  className={`py-3 px-6 rounded-md font-semibold ${
                    isLoading
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-red-500 text-white hover:bg-red-700"
                  }`}
                >
                  Clear
                </button>
              </div>
            </div>

            {errorMessage && (
                <div className="p-4 mb-4 bg-red-700 rounded-md">
                  <p className="text-sm text-white">{errorMessage}</p>
                </div>
            )}

            {/* Middle Column: Conversation + Input */}
            <div className="w-1/3 flex flex-col">
              {/* Conversation Box */}
              <div className="flex-grow bg-gray-800 p-6 rounded-lg overflow-y-auto" style={{ minHeight: "700px" }}>
                <h2 className="font-bold text-lg mb-4">Conversation</h2>
                {conversation.length === 0 ? (
                  <p className="text-gray-400 italic">No messages yet.</p>
                ) : (
                  <ul>
                    {conversation.map((msg, idx) => (
                      <li key={idx} className="mb-3">
                        <strong>{msg.role === "user" ? "You:" : "GPT:"}</strong> {msg.content}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Input Box Below Conversation */}
              <div className="mt-4 flex items-center gap-4">
                <input
                  type="text"
                  className="flex-grow p-2 text-black rounded-md"
                  placeholder="Ask or respond..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                >
                  Send
                </button>
              </div>
            </div>

            {/* Right Column: Post Preview */}
            <div className="w-1/3 bg-gray-700 p-6 rounded-lg overflow-y-auto" style={{ minHeight: "700px" }}>
              <h2 className="font-bold text-lg mb-4">Post Preview</h2>
              {postData ? (
                <div>
                  <p>
                    <strong>Description:</strong> {postData.description}
                  </p>
                  <p className="mt-4">
                    <strong>Price:</strong> {postData.price}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400 italic">
                  Once enough details are provided, your post preview (description &amp; price) will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostPage;



