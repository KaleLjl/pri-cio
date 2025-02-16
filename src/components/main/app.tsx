'use client'
import { useHistory } from '@/lib/hooks/useHistory';
import Image from 'next/image';
import { useShareCard } from '@/lib/hooks/useShareCard';
import Modal from '@/components/shared/Modal';
import { useLanguage } from '@/lib/context/LanguageContext';
import { useUploadMetaData } from '@/lib/hooks/upload/useUploadMetaData';
import { useUploadImageProcess } from '@/lib/hooks/upload/useUploadImageProcess';
import { useUploadAI } from '@/lib/hooks/upload/useUploadAI';
import { useUploadUI } from '@/lib/hooks/upload/useUploadUI';
import { useUploadActions } from '@/lib/hooks/upload/useUploadActions';

export type Currency = {
  value: string;
  label: string;
  symbol: string;
};

// 提取常量
// const CURRENCIES = [
//   { value: 'GBP', label: '£ GBP', symbol: '£' },
//   { value: 'USD', label: '$ USD', symbol: '$' },
//   { value: 'EUR', label: '€ EUR', symbol: '€' },
//   { value: 'CNY', label: '¥ CNY', symbol: '¥' },
// ].map(curr => ({
//   ...curr,
//   label: `  ${curr.label}  `
// }));

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
  const { dict } = useLanguage();
  const [metaState, metaActions] = useUploadMetaData();
  const [imageState, imageActions] = useUploadImageProcess();
  const [aiState, aiActions] = useUploadAI();
  const [uiState, uiActions] = useUploadUI();
  const { saveToHistory, isSaving } = useHistory();
  const { generateShareCard, handleShareCardGeneration, isGenerating } = useShareCard();

  const { 
    handleToHistory, 
    handleAnalyzeImage, 
    handleClearAll,
    handlePriceChange,
    handleDescriptionChange
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

  return (
    <>
      {/* 给标题和货币选择器的容器设置固定高度 */}
      <div className="flex flex-col justify-center mb-4">
        <div className="flex flex-col space-y-4">
          <div className="px-4">
            {!imageState.images.length && (
              <h2 className="text-3xl font-light text-white text-center tracking-wide">
                {dict.app.title}
              </h2>
            )}
            {imageState.images.length > 0 && !uiState.isEditing && (
              <h2 className="text-3xl font-light text-gray-600 text-center tracking-wide">
                {dict.app.titleWithPrice}
              </h2>
            )}
            {imageState.images.length > 0 && uiState.isEditing && (
              <h2 className="text-3xl font-light text-gray-600 text-center tracking-wide">
                {dict.app.titleEditing}
              </h2>
            )}
          </div>
          
          {/* 货币选择器只在没有图片时显示 */}
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

      {/* 这是图片,价格描述显示区域 */}
      <div 
        className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full bg-gray-800"
      >
        {/* 这是图片的显示区域 */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-96 aspect-square relative group">
            {imageState.primaryImage ? (
              <div className="relative w-full h-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <Image 
                  src={imageState.primaryImage} 
                  alt="Selected" 
                  fill
                  className="object-cover"
                  unoptimized
                />
                {aiState.isLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="w-full h-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-200 flex items-center justify-center group-hover:border-purple-500 transition-colors"
                onClick={imageActions.uploadImageFromDevice}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400 group-hover:text-purple-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            )}
          </div>

          {/* 缩略图预览区域 */}
          {imageState.images.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto w-full max-w-96 pb-2">
              {imageState.images.map((image) => (
                <div
                  key={image.id}
                  className={`relative w-16 h-16 flex-shrink-0 cursor-pointer rounded-lg overflow-hidden
                    ${image.isPrimary ? 'ring-2 ring-purple-500' : 'hover:ring-2 hover:ring-purple-300'}`}
                  onClick={() => imageActions.setPrimaryImage(image.id)}
                >
                  <Image
                    src={image.url}
                    alt="Thumbnail"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      imageActions.removeImage(image.id);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <div
                className="w-16 h-16 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg 
                  flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
                onClick={imageActions.uploadImageFromDevice}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            </div>
          )}

          {/* 这是价格与描述的显示区域 */}
          {imageState.primaryImage && (
            <div className="mt-2 text-center w-full space-y-4">
              <div className="flex justify-center">
                {uiState.isEditing && uiState.activeField === 'price' ? (
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-3xl font-semibold text-purple-600">
                      {CURRENCIES.find(c => c.value === metaState.currency)?.symbol}
                    </span>
                    <input
                      type="text"
                      value={metaState.price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          uiActions.stopEditing();
                        }
                      }}
                      className="w-auto min-w-[120px] pl-8 text-3xl font-semibold text-purple-600 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                      style={{ width: `${Math.max(120, (metaState.price?.length || 1) * 20)}px` }}
                      placeholder="0"
                    />
                  </div>
                ) : (
                  <div
                    className="flex items-center text-3xl font-semibold text-purple-600 cursor-pointer hover:bg-purple-100 rounded-lg px-4 py-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      uiActions.startEditing('price');
                    }}
                  >
                    <span className="mr-1">{CURRENCIES.find(c => c.value === metaState.currency)?.symbol}</span>
                    <span>
                      {metaState.price || '0.00'}
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full">
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
                    placeholder={dict.app.descriptionPlaceholder}
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

      {/* 以下三个区域为不同时候的按钮 */}
      {/* 这是在为上传图片时候显示的按钮 */}
      {!imageState.images.length && (
        <div className="flex space-x-4">
          <button onClick={imageActions.uploadImageFromDevice} disabled={aiState.isLoading} className="flex items-center justify-start w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-purple-500 hover:text-white disabled:opacity-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {dict.app.uploadButton}
          </button>
        </div>
      )}
      {/* 这是在上传图片后显示的按钮 */}
      {imageState.images.length > 0 && (
        <div className="flex space-x-4">
          <button 
            onClick={handleToHistory} 
            disabled={aiState.isLoading || isSaving} 
            className="flex items-center justify-start w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-purple-500 hover:text-white disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {dict.app.exportButton}
          </button>
          <button 
            onClick={() => handleShareCardGeneration({
              imageUrl: imageState.primaryImage!,
              price: metaState.price,
              description: metaState.description,
              currency: metaState.currency
            })} 
            disabled={aiState.isLoading || isGenerating} 
            className="flex items-center justify-start w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-purple-500 hover:text-white disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            {dict.app.shareButton}
          </button>
          <button 
            onClick={handleClearAll} 
            disabled={aiState.isLoading} 
            className="flex items-center justify-start w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-red-600 hover:text-white disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            {dict.app.deleteButton}
          </button>
        </div>
      )}

      <Modal 
        title={dict.app.errorTitle}
        message={aiState.errorMessage}
        isOpen={aiState.showErrorModal}
        onClose={aiActions.closeErrorModal}
        onConfirm={aiActions.closeErrorModal}
        confirmText={dict.app.closeButton}
        cancelText={dict.app.cancelButton}
      />
    </>
  );
}










