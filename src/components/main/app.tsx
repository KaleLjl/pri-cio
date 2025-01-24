'use client'
import { useImageCapture } from '@/lib/hooks/useImageCapture';
import { useHistory } from '@/lib/hooks/useHistory';
import Image from 'next/image';
import { useShareCard } from '@/lib/hooks/useShareCard';
import Modal from '@/components/shared/Modal';
import { useLanguage } from '@/lib/context/LanguageContext';

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
  const [state, actions] = useImageCapture();
  const { saveToHistory, isSaving } = useHistory();
  const { generateShareCard } = useShareCard();


  const handleExport = async () => {
    try {
      actions.setIsEditing(false);
      if (!state.selectedImage) {
        throw new Error('No image selected');
      }

      // 并行执行两个操作
      const [shareCardUrl] = await Promise.all([
        // 1. 生成卡
        generateShareCard({
          imageUrl: state.selectedImage,  // 直接使用前端的图片
          price: state.price,
          description: state.description,
          currency: state.currency
        }).catch(error => {
          console.error('Failed to generate share card:', {
            error: error.message,
            details: error,
            requestData: {
              imageUrl: state.selectedImage,
              price: state.price,
              description: state.description,
              currency: state.currency
            }
          });
          throw error;
        }),
        // 2. 保存到历史记录
        saveToHistory(
          state.price, 
          state.description, 
          state.selectedImage,
          state.currency
        ).catch(error => {
          console.error('Failed to save to history:', {
            error: error.message,
            details: error,
            requestData: {
              price: state.price,
              description: state.description,
              imageUrl: state.selectedImage,
              currency: state.currency
            }
          });
          throw error;
        })
      ]);

      // 3. 下载分享卡片
      const link = document.createElement('a');
      link.href = shareCardUrl;
      link.download = 'pricio-share.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(shareCardUrl);
    } catch (error) {
      console.error('Export operation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  };
  return (
    <>
      {/* 给标题和货币选择器的容器设置固定高度 */}
      <div className="flex flex-col justify-center mb-4">
        <div className="flex flex-col space-y-4">
          <div className="px-4">
            {!state.description && !state.price && (
              <h2 className="text-3xl font-light text-white text-center tracking-wide">
                {dict.app.title}
              </h2>
            )}
            {(state.description || state.price) && !state.isEditing && (
              <h2 className="text-3xl font-light text-gray-600 text-center tracking-wide">
                {dict.app.titleWithPrice}
              </h2>
            )}
            {(state.description || state.price) && state.isEditing && (
              <h2 className="text-3xl font-light text-gray-600 text-center tracking-wide">
                {dict.app.titleEditing}
              </h2>
            )}
          </div>
          
          {/* 货币选择器只在没有价格和描述时显示 */}
          {!state.description && !state.price && (
            <div className="flex justify-center">
              <select
                value={state.currency}
                onChange={(e) => actions.setCurrency(e.target.value)}
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
            {state.selectedImage ? (
              <div className="relative w-full h-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <Image 
                  src={state.selectedImage} 
                  alt="Selected" 
                  fill
                  className="object-cover"
                  unoptimized
                />
                {state.isLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="w-full h-full border-2 border-dashed border-gray-300 rounded-xl bg-gray-200 flex items-center justify-center group-hover:border-purple-500 transition-colors"
                onClick={actions.uploadImageFromDevice}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400 group-hover:text-purple-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            )}
          </div>
          {/* 这是价格与描述的显示区域 */}
          {(state.description || state.price) && (
            <div className="mt-2 text-center w-full space-y-4">
              <div  className="flex justify-center">
                {state.isEditing ? (
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-3xl font-semibold text-purple-600">
                      {CURRENCIES.find(c => c.value === state.currency)?.symbol}
                    </span>
                    <input
                      type="text"
                      value={state.price}
                      onChange={(e) => {
                        const value = e.target.value;
                        
                        // 只允许数字和一个小数点
                        if (!/^\d*\.?\d*$/.test(value)) {
                          return;
                        }

                        // 检查小数点后是否超过两位
                        const parts = value.split('.');
                        if (parts[1] && parts[1].length > 2) {
                          return;
                        }

                        // 限制整数部分为12位
                        if (parts[0].length > 12) {
                          return;
                        }

                        const numericValue = parseFloat(value);
                        if (!isNaN(numericValue) || value === '' || value === '.') {
                          actions.setPrice(value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          actions.setIsEditing(false);
                        }
                      }}
                      className="w-auto min-w-[120px] pl-8 text-3xl font-semibold text-purple-600 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                      style={{ width: `${Math.max(120, (state.price?.length || 1) * 20)}px` }}
                      placeholder="0"
                    />
                  </div>
                ) : (
                  <div
                    className="flex items-center text-3xl font-semibold text-purple-600 cursor-pointer hover:bg-purple-100 rounded-lg px-4 py-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.setIsEditing(true);
                    }}
                  >
                    <span className="mr-1">{CURRENCIES.find(c => c.value === state.currency)?.symbol}</span>
                    <span>
                      {state.price || '0.00'}
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full">
                {state.isEditing ? (
                  <textarea
                    value={state.description}
                    onChange={(e) => {
                      const input = e.target.value;
                      if (input.length <= 100) {
                        actions.setDescription(input);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        actions.setIsEditing(false);
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
                      actions.setIsEditing(true);
                    }}
                    style={{ color: state.description ? '#4B5563' : 'rgba(75, 85, 99, 0.5)' }}
                  >
                    {state.description || 'Enter description here...'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 以下三个区域为不同时候的按钮 */}
      {/* 这是在为上传图片时候显示的按钮 */}
      {!state.selectedImage && (
        <div className="flex space-x-4">
          <button onClick={actions.uploadImageFromDevice} disabled={state.isLoading} className="flex items-center justify-start w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-purple-500 hover:text-white disabled:opacity-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {dict.app.uploadButton}
          </button>
        </div>
      )}
      {/* 这是在上传图片但是未估计价格时现实的按钮 */}
      {state.selectedImage && !state.description && !state.price && (
        <div className="flex space-x-4">
          <button onClick={actions.analyzeImageWithAI} disabled={state.isLoading} className="flex items-center justify-start w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-purple-500 hover:text-white disabled:opacity-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {dict.app.priceButton}
          </button>
          <button onClick={actions.clearImageAndData} disabled={state.isLoading} className="flex items-center justify-start w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-red-600 hover:text-white disabled:opacity-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            {dict.app.deleteButton}
          </button>
        </div>
      )}
      {/* 这是在上传图片后又估计了价格后显示的按钮 */}
      {(state.description || state.price) && (
        <div className="flex space-x-4">
          <button 
            onClick={handleExport} 
            disabled={state.isLoading || isSaving} 
            className="flex items-center justify-start w-32 px-4 py-2 bg-white text-black rounded-lg hover:bg-purple-500 hover:text-white disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {dict.app.exportButton}
          </button>
          <button 
            onClick={actions.clearImageAndData} 
            disabled={state.isLoading} 
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
        message={state.errorMessage}
        isOpen={state.showErrorModal}
        onClose={actions.closeErrorModal}
        onConfirm={actions.closeErrorModal}
        confirmText={dict.app.closeButton}
        cancelText={dict.app.cancelButton}
      />
    </>
  );
}










