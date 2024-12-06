'use client'
import { useImageCapture } from '@/lib/hooks/useImageCapture';
import Image from 'next/image';
import LogoName from '../public/image/logo_name.png';
import Webcam from 'react-webcam';

export default function Home() {
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
    closeEditModeOnOutsideClick,
    webcamRef,
  } = useImageCapture();


  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 overflow-y-auto pb-12 flex flex-col items-center px-4 space-y-4 pt-4"
      onClick={closeEditModeOnOutsideClick}
    >
      {/* Logo */}
      <div className="w-full flex justify-center pt-4 pb-2">
        <Image 
          src={LogoName} 
          alt="PRI-CIO Logo" 
          className="w-[400px] h-auto mb-1"
        />
      </div>
      
      <div className="h-16">
        {!description && !price && (
          <h2 className="text-3xl font-light text-gray-600 text-center tracking-wide">
            What price do you want to know?
          </h2>
        )}
        {(description || price) && !isEditing && (
          <h2 className="text-3xl font-light text-gray-600 text-center tracking-wide">
            Click to edit
          </h2>
        )}
      </div>
        <div 
          id="export-content"
          className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full cursor-pointer"
          onClick={(e) => {
            if (!isEditing && (description || price)) {
              e.stopPropagation();
              setIsEditing(true);
            }
          }}
        >

          {/* 卡片内容 */}
      
          {/* 图片显示区域 */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-96 aspect-square relative group">
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
                  className="w-full h-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center group-hover:border-blue-400 transition-colors"
                  onClick={uploadImageFromDevice}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              )}
            </div>

          {/* 描述和价格显示区域 */}
            {(description || price) && (
              <div className="mt-2 text-center w-full">
                <div className="flex gap-4 rounded-xl">
                  {/* 价格部分在左边 */}
                  <div className="flex-shrink-0 flex items-center justify-center">
                    {isEditing ? (
                      <div className="relative flex items-center">
                        <span className="absolute left-4 text-3xl font-semibold text-purple-600">$</span>
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
                          className="w-auto min-w-[80px] pl-10 text-3xl font-semibold text-purple-600 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                          size={Math.max(1, price?.length || 1)}
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <div 
                        className="flex items-center text-3xl font-semibold text-purple-600 cursor-pointer hover:bg-purple-100 rounded-lg px-4 py-2"
                        onClick={() => setIsEditing(true)}
                      >
                        <span className="mr-1">$</span>
                        <span>{price || '0.00'}</span>
                      </div>
                    )}
                  </div>

                  {/* 描述部分占据剩余空间 */}
                  <div className="flex-grow">
                    {isEditing ? (
                      <textarea
                        value={description}
                        onChange={(e) => {
                          const currentWord = e.target.value.split(/\s+/).pop() || '';
                          const consecutiveSpaces = e.target.value.match(/\s+/g);
                          const maxSpaces = consecutiveSpaces ? Math.max(...consecutiveSpaces.map(s => s.length)) : 0;
                          
                          if (currentWord.length <= 15 && maxSpaces <= 5) {
                            setDescription(e.target.value.replace(/[\r\n]/g, ''));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                        className="w-full p-2 text-lg text-gray-600 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        style={{
                          height: 'auto',
                          overflow: 'hidden',
                        }}
                        ref={(textArea) => {
                          if (textArea) {
                            textArea.style.height = 'auto';
                            textArea.style.height = textArea.scrollHeight + 'px';
                          }
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                    ) : (
                      <p 
                        className="text-lg p-2 cursor-pointer hover:bg-purple-100 rounded-lg whitespace-pre-wrap text-left"
                        onClick={() => setIsEditing(true)}
                        style={{ color: description ? '#4B5563' : 'rgba(75, 85, 99, 0.5)' }}
                      >
                        {description || 'Enter description here...'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 相机预览区域 */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg relative">
      
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 720,
                  height: 720,
                  facingMode: "environment"
                }}
                className="w-full max-w-md rounded-lg"
              />
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={captureAndSaveImage}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg"
                >
                  Take Photo
                </button>
                <button
                  onClick={() => setShowCamera(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 上传图片时的按钮 */}
        {!selectedImage && (
          <div className="flex space-x-4">
            <button onClick={openCameraView} disabled={isLoading} className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              Camera
            </button>
            <button onClick={uploadImageFromDevice} disabled={isLoading} className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Photos
            </button>
          </div>
        )}

        {/* 处理图片时的按钮 */}
        {selectedImage && !description && !price && (
          <div className="flex space-x-4">
            <button onClick={analyzeImageWithAI} disabled={isLoading} className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Price it
            </button>
            <button onClick={clearImageAndData} disabled={isLoading} className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Delete
            </button>
          </div>
        )}

        {/* 导出图片时的按钮 */}
        {(description || price) && (
          <div className="flex space-x-4">
            <button 
              onClick={() => {
                setIsEditing(false);
                setTimeout(() => {
                  exportAsImage();
                }, 100);
              }} 
              disabled={isLoading} 
              className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </button>
            <button 
              onClick={clearImageAndData} 
              disabled={isLoading} 
              className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Delete
            </button>
          </div>
        )}
    </div>
  );
}
