'use client'
import { useHistory } from '@/lib/hooks/useHistory';
import Image from 'next/image';
import { useShareCard } from '@/lib/hooks/useShareCard';
import Modal from '@/components/shared/Modal';
import { useUploadMetaData } from '@/lib/hooks/upload/useUploadMetaData';
import { useUploadImageProcess } from '@/lib/hooks/upload/useUploadImageProcess';
import { useUploadAI } from '@/lib/hooks/upload/useUploadAI';
import { useUploadUI } from '@/lib/hooks/upload/useUploadUI';
import { useUploadActions } from '@/lib/hooks/upload/useUploadActions';
import ChatAIModal from '@/components/shared/ChatAIModal';
import { useState, useEffect } from 'react';
import { useUploadAIChat } from '@/lib/hooks/upload/useUploadAIChat';
import Toast from '@/components/shared/Toast';

export type Currency = {
  value: string;
  label: string;
  symbol: string;
};

export const CURRENCIES: Currency[] = [
  { value: 'GBP', label: '£ GBP', symbol: '£' },
  { value: 'USD', label: '$ USD', symbol: '$' },
  { value: 'EUR', label: '€ EUR', symbol: '€' },
  { value: 'CNY', label: '¥ CNY', symbol: '¥' },
].map((curr) => ({
  ...curr,
  label: `  ${curr.label}  `,
}));

export default function ImageCapture() {
  const [metaState, metaActions] = useUploadMetaData();
  const [imageState, imageActions] = useUploadImageProcess();
  const [aiState, aiActions] = useUploadAI();
  const [aiChatState, aiChatActions] = useUploadAIChat();
  const [uiState, uiActions] = useUploadUI();
  const { saveToHistory, isSaving } = useHistory();
  const { generateShareCard, handleShareCardGeneration, isGenerating } = useShareCard();
  const [showChatAI, setShowChatAI] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const { 
    handleToHistory, 
    handleAnalyzeImage, 
    handleClearAll,
    handlePriceChange,
    handleDescriptionChange,
    handleChatAISuccess,
    toastState
  } = useUploadActions({
    metaState,
    metaActions,
    imageState,
    imageActions,
    uiActions,
    aiActions,
    saveToHistory,
    generateShareCard,
  });

  const { showToast: toastStateShowToast, toastMessage: toastStateToastMessage, toastType: toastStateToastType, setShowToast: toastStateSetShowToast } = toastState;

  const showNewToast = (message: string, type: 'success' | 'error' | 'info') => {
    setShowToast(false);
    setTimeout(() => {
      setToastMessage(message);
      setToastType(type);
      setShowToast(true);
    }, 100);
  };

  useEffect(() => {
    if (aiState.isLoading) {
      showNewToast('AI is analyzing...', 'info');
    }
    if (aiState.errorMessage) {
      showNewToast(aiState.errorMessage, 'error');
    }
  }, [aiState.isLoading, aiState.errorMessage]);

  return (
    <>
      {/* Container for title and currency selector */}
      <div className="flex flex-col justify-center mb-4">
        <div className="flex flex-col space-y-4">
          <div className="px-4">
            {!imageState.images.length && (
              <h2 className="text-3xl font-light text-white text-center tracking-wide">
                Upload your item
              </h2>
            )}
            {imageState.images.length > 0 && !uiState.isEditing && (
              <h2 className="text-3xl font-light text-gray-600 text-center tracking-wide">
                Set your price
              </h2>
            )}
            {imageState.images.length > 0 && uiState.isEditing && (
              <h2 className="text-3xl font-light text-gray-600 text-center tracking-wide">
                Edit your item
              </h2>
            )}
          </div>
          
          {/* Currency selector only shown when no images */}
          {!imageState.images.length && (
            <div className="flex justify-center">
              <select
                value={metaState.currency}
                onChange={(e) => metaActions.setCurrency(e.target.value)}
                className="bg-transparent text-white border border-gray-600 rounded-lg px-3 py-1 
                  focus:outline-none focus:ring-2 focus:ring-purple-500 
                  hover:border-purple-500 transition-colors duration-200
                  w-32 cursor-pointer appearance-none
                  bg-gray-800/30 backdrop-blur-sm text-center"
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  textAlignLast: 'center',
                  textAlign: 'center'
                }}
              >
                {CURRENCIES.map((curr) => (
                  <option 
                    key={curr.value} 
                    value={curr.value} 
                    className="bg-gray-800 text-white hover:bg-gray-700 text-center"
                  >
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Image, price and description display area */}
      <div 
        className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full bg-gray-800"
      >
        {/* Image display area */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-96 aspect-square relative group">
            {imageState.primaryImage ? (
              <div className="relative w-full h-full">
                <Image
                  src={imageState.primaryImage}
                  alt="Uploaded"
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-2xl"
                />
                {/* Image controls */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center">
                  <div className="flex space-x-4">
                    <button
                      onClick={imageActions.uploadImageFromDevice}
                      className="p-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={handleAnalyzeImage}
                      className="p-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                      </svg>
                    </button>
                    <button
                      onClick={imageActions.clearImage}
                      className="p-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={imageActions.uploadImageFromDevice}
                className="w-full h-full border-2 border-dashed border-gray-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="mt-4 text-gray-600">Click to upload</p>
              </div>
            )}
          </div>

          {/* Price and description */}
          {imageState.primaryImage && (
            <div className="w-full mt-8 space-y-6">
              {/* Price input */}
              <div>
                {uiState.isEditing && uiState.activeField === 'price' ? (
                  <input
                    type="number"
                    value={metaState.price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        uiActions.stopEditing();
                      }
                    }}
                    className="w-full p-2 text-2xl text-gray-600 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                    placeholder="Enter price"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p 
                    className="text-2xl text-center p-2 cursor-pointer hover:bg-purple-100 rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      uiActions.startEditing('price');
                    }}
                    style={{ color: metaState.price ? '#4B5563' : 'rgba(75, 85, 99, 0.5)' }}
                  >
                    {metaState.price ? `${CURRENCIES.find(c => c.value === metaState.currency)?.symbol}${metaState.price}` : 'Enter price'}
                  </p>
                )}
              </div>

              {/* Description input */}
              <div>
                {uiState.isEditing && uiState.activeField === 'description' ? (
                  <textarea
                    value={metaState.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        uiActions.stopEditing();
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
                    placeholder="Enter description here..."
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p 
                    className="text-lg p-2 cursor-pointer hover:bg-purple-100 rounded-lg whitespace-pre-wrap text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      uiActions.startEditing('description');
                    }}
                    style={{ color: metaState.description ? '#4B5563' : 'rgba(75, 85, 99, 0.5)' }}
                  >
                    {metaState.description || 'Enter description here...'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Button areas for different states */}
      {/* Buttons for initial upload */}
      {!imageState.images.length && (
        <div className="flex space-x-4">
          <button onClick={imageActions.uploadImageFromDevice} disabled={aiState.isLoading} className="flex items-center justify-start w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-purple-500 hover:text-white disabled:opacity-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            Upload
          </button>
        </div>
      )}
      {/* Buttons after upload */}
      {imageState.images.length > 0 && (
        <div className="flex space-x-4">
          <button 
            onClick={handleToHistory} 
            disabled={aiState.isLoading || isSaving} 
            className="flex items-center justify-center w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-purple-500 hover:text-white disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Upload
          </button>
          <button 
            onClick={() => setShowChatAI(true)} 
            disabled={aiState.isLoading} 
            className="flex items-center justify-center w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-blue-500 hover:text-white disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            AI
          </button>
          <button 
            onClick={handleClearAll} 
            disabled={aiState.isLoading} 
            className="flex items-center justify-center w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-red-600 hover:text-white disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      )}

      <Modal 
        title="Error"
        message={aiState.errorMessage || ''}
        isOpen={aiState.showErrorModal}
        onClose={aiActions.closeErrorModal}
        onConfirm={aiActions.closeErrorModal}
        confirmText="Close"
        cancelText="Cancel"
      />

      <ChatAIModal
        isOpen={showChatAI}
        onClose={() => {
          setShowChatAI(false);
          aiChatActions.clearConversation();
        }}
        onSuccess={handleChatAISuccess}
        imageUrl={imageState.primaryImage || ''}
        isLoading={aiChatState.isLoading}
        currency={metaState.currency}
        conversation={aiChatState.conversation}
        onSendMessage={aiChatActions.sendMessage}
        onInitialAnalysis={aiChatActions.handleInitialAnalysis}
      />

      <Toast 
        message={toastStateToastMessage}
        isVisible={toastStateShowToast}
        onClose={() => toastStateSetShowToast(false)}
        type={toastStateToastType}
        duration={2000}
      />
    </>
  );
}










