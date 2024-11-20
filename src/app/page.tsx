'use client'
import { useImageCapture } from '@/lib/hooks/useImageCapture';
import Image from 'next/image';
import LogoName from '../public/image/logo_name.png';
import '../css/page.css';


export default function Home() {
  const { 
    selectedImage, 
    isLoading, 
    description, 
    price, 
    handleCamera, 
    handlePhotoUpload, 
    uploadImage,
    handleDeleteImage ,
  } = useImageCapture();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
      <div className="flex flex-col items-center space-y-6 bg-white p-8 rounded-2xl shadow-lg max-w-md w-full mx-4">
        <Image src={LogoName} alt="PRI-CIO Logo" className="logoname" />
        <h2 className="text-2xl text-gray-600">What price do you want to know?</h2>

        {/* 展示图片 */}
        <div className="w-64 h-64 relative group">
          {selectedImage ? (
            <div className="relative w-full h-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <img 
                src={selectedImage} 
                alt="Selected" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : ( 
            <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center group-hover:border-blue-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
          )}
        </div>
          
      {/* 上传图片 */}
       {!selectedImage&&<div className="flex space-x-4">
         {/* 用相机上传图片 */}
          <button 
            onClick={handleCamera} 
            disabled={isLoading}
            className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-400 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            Camera 
          </button>
        {/* 从相册上传图片 */}
          <button 
            onClick={handlePhotoUpload}
            disabled={isLoading} 
            className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-400 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            Photos 
          </button>
        </div>}

      {/* 上传与删除按钮 */}
        {selectedImage && (
          <div className="flex space-x-4">
            <button
              onClick={uploadImage}
              disabled={isLoading}
              className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-400 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {isLoading ? 'Loading' : 'Price it'}
            </button>
            
            <button
              onClick={handleDeleteImage}
              disabled={isLoading}
              className="flex items-center justify-start w-32 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-red-400 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Delete
            </button>
          </div>
        )}

        {/* 显示描述和价格 */}
        {description && (
          <div className="mt-4 text-center">
            <p className="text-lg text-gray-600 mb-3">
              {description}
            </p>
            <p className="text-2xl font-semibold text-purple-600">
              Price: {price}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
