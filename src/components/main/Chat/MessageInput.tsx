import React from 'react';
import { useMessageActions } from '@/hooks/chat/useMessageActions';
import { useLanguage } from '@/context/LanguageContext';
import { useChatContext } from '@/context/ChatContext';

const MessageInput: React.FC = () => {
  const { dict } = useLanguage();
  const { currentUserId, otherUser, conversationId } = useChatContext();
  const [inputMessage, setInputMessage] = React.useState('');

  // Get message actions
  const { 
    handleSubmit: handleMessageSubmit,
    isLoading: isSendingMessage
  } = useMessageActions({
    conversationId,
    currentUserId: currentUserId || undefined,
    otherUserId: otherUser?._id,
    handleMessageSubmit: (message: string) => {
      setInputMessage('');
    }
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      handleMessageSubmit(e);
    }
  };

  // Handle input change
  const handleMessageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  // If required data is not available, don't render the component
  if (!otherUser?._id || !currentUserId || !conversationId) {
    return null;
  }

  return (
    <div className="p-4 border-t border-gray-700/50">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputMessage}
            onChange={handleMessageInput}
            placeholder={dict.chat.input.placeholder}
            className="w-full bg-gray-700/50 backdrop-blur-sm text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={!inputMessage.trim() || isSendingMessage}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
        >
          {isSendingMessage ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            dict.chat.actions.send
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput; 