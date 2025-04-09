import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ChatAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (description: string, price: string) => void;
  imageUrl: string;
  isLoading: boolean;
  currency: string;
  conversation: Array<{ role: string; content: string }>;
  onSendMessage: (message: string, imageUrl: string, currency: string) => Promise<{
    reply?: string;
    postData?: {
      description: string;
      price: string;
    };
  }>;
  onInitialAnalysis: (imageUrl: string, currency: string) => Promise<{
    detailedDescription?: string;
    postData?: {
      description: string;
      price: string;
    };
  }>;
}

export default function ChatAIModal({
  isOpen,
  onClose,
  onSuccess,
  imageUrl,
  isLoading,
  currency,
  conversation,
  onSendMessage,
  onInitialAnalysis
}: ChatAIModalProps) {
  const [messageInput, setMessageInput] = useState("");
  const [initialAnalysisDone, setInitialAnalysisDone] = useState(false);
  const [isFirstMount, setIsFirstMount] = useState(true);

  // 只在首次挂载时执行一次
  useEffect(() => {
    setIsFirstMount(false);
  }, []);

  // 只在模态框打开且是首次挂载时执行分析
  useEffect(() => {
    const shouldAnalyze = isOpen && imageUrl && (isFirstMount || !initialAnalysisDone);
    
    if (shouldAnalyze) {
      (async () => {
        try {
          const data = await onInitialAnalysis(imageUrl, currency);
          if (data?.postData?.description && data?.postData?.price) {
            onSuccess(data.postData.description, data.postData.price);
            setTimeout(() => {
              onClose();
            }, 1500);
          }
          setInitialAnalysisDone(true);
        } catch (error) {
          console.error('Initial analysis error:', error);
        }
      })();
    }
  }, [isOpen, imageUrl, isFirstMount]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setInitialAnalysisDone(false);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isLoading) return;

    setMessageInput("");

    try {
      const data = await onSendMessage(messageInput, imageUrl, currency);

      if (data?.postData?.description && data?.postData?.price) {
        onSuccess(data.postData.description, data.postData.price);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error in chat:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-xl w-[800px] max-h-[80vh] p-6 text-white"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Chat with AI Assistant</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex gap-6">
          {/* Left side - Image Preview */}
          <div className="w-1/3 aspect-square relative rounded-lg overflow-hidden bg-gray-800">
            <img
              src={imageUrl}
              alt="Item"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right side - Chat */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[400px] h-[400px] bg-gray-800 rounded-lg p-4">
              {!initialAnalysisDone && (isLoading) ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center">
                    <div className="flex space-x-2 mb-4">
                      <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <p className="text-gray-400">Analyzing your image...</p>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  {conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-white'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {(isLoading) && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 text-white rounded-lg p-3">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about the item..."
                className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!initialAnalysisDone || isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!initialAnalysisDone || isLoading || !messageInput.trim()}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}