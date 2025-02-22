import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ChatAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (description: string, price: string) => void;
  imageUrl: string;
  isLoading: boolean;
  currency: string;
}

interface Message {
  role: string;
  content: string;
}

export default function ChatAIModal({
  isOpen,
  onClose,
  onSuccess,
  imageUrl,
  isLoading,
  currency,
}: ChatAIModalProps) {
  const [messageInput, setMessageInput] = useState("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [initialAnalysisDone, setInitialAnalysisDone] = useState(false);

  // 当模态框打开时进行初始分析
  useEffect(() => {
    if (isOpen && !initialAnalysisDone && imageUrl) {
      handleInitialAnalysis();
    }
  }, [isOpen, imageUrl]);

  const handleInitialAnalysis = async () => {
    setLocalLoading(true);
    try {
      const response = await fetch('/api/createpost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageUrl,
          currency,
          isInitialAnalysis: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();

      if (data.detailedDescription) {
        setConversation([
          { role: 'assistant', content: data.detailedDescription }
        ]);
      }

      // If we have complete data from initial analysis, update and close
      if (data.postData?.description && data.postData?.price) {
        onSuccess(data.postData.description, data.postData.price);
        // Add a small delay before closing to let the user see the final message
        setTimeout(() => {
          onClose();
        }, 1500);
      }

      setInitialAnalysisDone(true);
    } catch (error) {
      console.error('Initial analysis error:', error);
      setConversation([
        { role: 'assistant', content: 'Sorry, I encountered an error analyzing the image. Please try asking me about it.' }
      ]);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || localLoading) return;

    // Add user message to conversation
    const updatedConversation = [...conversation, { role: 'user', content: messageInput }];
    setConversation(updatedConversation);
    setMessageInput("");
    setLocalLoading(true);

    try {
      const response = await fetch('/api/createpost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          conversation: updatedConversation,
          imageUrl,
          currency
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to communicate with AI');
      }

      const data = await response.json();

      // Add AI's response to conversation
      setConversation(prev => [...prev, { role: 'assistant', content: data.reply }]);

      // If we have structured data, pass it to the parent and close the modal
      if (data.postData?.description && data.postData?.price) {
        onSuccess(data.postData.description, data.postData.price);
        // Add a small delay before closing to let the user see the final message
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setConversation(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setLocalLoading(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInitialAnalysisDone(false);
      setConversation([]);
      setMessageInput("");
    }
  }, [isOpen]);

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
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[300px] max-h-[400px] bg-gray-800 rounded-lg p-4">
              {!initialAnalysisDone && (localLoading || isLoading) ? (
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
                <>
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
                  {(isLoading || localLoading) && (
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
                </>
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
                disabled={!initialAnalysisDone || isLoading || localLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!initialAnalysisDone || isLoading || localLoading || !messageInput.trim()}
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