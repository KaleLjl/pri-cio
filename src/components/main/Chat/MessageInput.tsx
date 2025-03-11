import React from 'react';
import { useChatUI } from '@/hooks/chat/useChatUI';
import { useMessageActions } from '@/hooks/chat/useMessageActions';
import { useChatData } from '@/hooks/chat/useGetData';
import { useLanguage } from '@/context/LanguageContext';

const MessageInput: React.FC<{ userId: string; conversationId: string; otherUserId: string }> = ({ 
  userId, 
  conversationId,
  otherUserId 
}) => {
  const { dict } = useLanguage();
  
  // Get chat data
  const { messages } = useChatData({ 
    userId, 
    conversationId 
  });
  
  // Get UI state
  const { 
    inputMessage, 
    handleMessageInput
  } = useChatUI({
    messages,
    currentUserId: userId,
    conversationId,
    fetchNextPage: async () => {},
    hasNextPage: false,
    userPosts: []
  });
  
  // Get message actions
  const { 
    handleSubmit,
    isLoading: isSendingMessage
  } = useMessageActions({
    conversationId,
    currentUserId: userId,
    otherUserId
  });

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