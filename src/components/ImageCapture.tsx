'use client';

import { useImageCapture } from '@/lib/hooks/useImageCapture';
import { useHistory } from '@/lib/hooks/useHistory';
import Image from 'next/image';
import Webcam from 'react-webcam';
import { useEffect } from 'react';


export default function ImageCapture() {
  const {
    selectedImage,
    isLoading,
    isEditing,
    showCamera,
    setShowCamera,
    setIsEditing,
    openCameraView,
    captureAndSaveImage,
    uploadImageFromDevice,
    analyzeImageWithAI,
    clearImageAndData,
    setPrice,
    exportAsImage,
    price,
    setDescription,
    description,
    webcamRef,
  } = useImageCapture();

  
  const { saveToHistory, isSaving } = useHistory();

  //这个function用来在导出图片的时候同时也把数据存在后端服务器中
  const handleExport = async () => {
    try {
      setIsEditing(false);
      if (!selectedImage) {
        throw new Error('No image selected');
      }
      await saveToHistory(price, description, selectedImage);
      await exportAsImage();
    } catch (error) {
      console.error('Failed to save history:', error);
      // 可以添加错误提示
    }
  };

  //这个hook是用来实现点击外部区域后退出编辑模式用的
  useEffect(() => {
    if (isEditing) {
      document.addEventListener('mousedown', closeEditModeOnOutsideClick);
      return () => {
        document.removeEventListener('mousedown', closeEditModeOnOutsideClick);
      };
    }
  }, [isEditing, closeEditModeOnOutsideClick]);

  return (
    <>
      {/* Inline CSS */}
      <style jsx>{`
        html,
        body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden; /* Prevent scrolling */
        }

        .main-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          background-color: #1a202c; /* Background color for the whole page */
        }

        .content-container {
          flex: 1; /* Ensures it takes up remaining space */
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 1rem;
        }

        .footer {
          width: 100%;
          padding: 0.5rem;
          background-color: #111827; /* Footer background */
          color: white;
          text-align: center;
        }
      `}</style>

      <div className="main-wrapper">
        {/* Content Section */}
        <div className="content-container">
          <div className="flex flex-col justify-start items-center w-11/12 max-w-5xl h-4/5 bg-gray-800 rounded-2xl p-6">
            {/* Title */}
            <div className="w-full mb-4 text-center">
              <h2 className="text-3xl font-light tracking-wide text-white">
                What price do you want to know?
              </h2>
            </div>

            {/* Main Content */}
            <div className="flex flex-row justify-between items-start w-full h-[calc(100%-4rem)]">
              {/* Left Section: Placing Picture */}
              <div className="flex flex-col justify-center items-center w-1/2 h-full bg-gray-700 p-4 rounded-xl">
                {selectedImage ? (
                  <div className="relative w-full h-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <Image
                      src={selectedImage}
                      alt="Selected"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div
                    className="w-full h-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-600 flex items-center justify-center group-hover:border-purple-500 transition-colors cursor-pointer"
                    onClick={uploadImageFromDevice}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12 text-gray-400 group-hover:text-purple-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                  </div>
                )}
                {/* Buttons */}
                <div className="flex gap-4 mt-4">
                  {!selectedImage && (
                    <>
                      <button
                        onClick={openCameraView}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                      >
                        Open Camera
                      </button>
                      <button
                        onClick={uploadImageFromDevice}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                      >
                        Upload Image
                      </button>
                    </>
                  )}
                  {selectedImage && (
                    <>
                      <button
                        onClick={analyzeImageWithAI}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                      >
                        Analyze
                      </button>
                      <button
                        onClick={clearImageAndData}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Right Section: Generate Context */}
              <div className="flex flex-col justify-between items-center w-1/2 h-full bg-gray-700 p-4 rounded-xl">
                {/* Price */}
                <div className="flex items-center justify-center w-full mb-4">
                  {isEditing ? (
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-3xl font-semibold text-purple-600">
                        $
                      </span>
                      <input
                        type="text"
                        value={price}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*\.?\d{0,2}$/.test(value)) {
                            const wholeNumber = parseInt(value.split('.')[0] || '0');
                            if (wholeNumber > 99999) {
                              alert('Price cannot exceed 99999');
                              return;
                            }
                            setPrice(value || '0');
                          }
                        }}
                        className="w-32 pl-10 text-3xl font-semibold text-purple-600 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <div
                      className="text-3xl font-semibold text-purple-600 cursor-pointer"
                      onClick={() => setIsEditing(true)}
                    >
                      {price || '0.00'}
                    </div>
                  )}
                </div>
                {/* Context */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-grow w-full text-lg text-gray-300 bg-gray-600 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter description here..."
                  style={{ height: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}





