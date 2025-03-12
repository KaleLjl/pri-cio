import React from 'react';
import { useChatUI } from '@/hooks/chat/useChatUI';
import { useMessageActions } from '@/hooks/chat/useMessageActions';
import { useChatData } from '@/hooks/chat/useGetData';
import { useLanguage } from '@/context/LanguageContext';
import { useChatContext } from '@/context/ChatContext';

// Updated to use ChatContext instead of props
const MessageInput: React.FC = () => {
  const { dict } = useLanguage();
  
  // Get chat data from context
  const { currentUserId, otherUser, conversationId } = useChatContext();
  
  // Get chat data - always call hooks at the top level
  const { messages } = useChatData({ 
    userId: currentUserId || '', 
    conversationId 
  });
  
  // Get UI state - always call hooks at the top level
  const { 
    inputMessage, 
    handleMessageInput
  } = useChatUI({
    messages,
    currentUserId: currentUserId || '',
    conversationId,
    fetchNextPage: async () => {},
    hasNextPage: false,
    userPosts: []
  });
  
  // Get message actions - always call hooks at the top level
  const userId = currentUserId || undefined;
  const { 
    handleSubmit,
    isLoading: isSendingMessage
  } = useMessageActions({
    conversationId,
    currentUserId: userId,
    otherUserId: otherUser?._id || ''
  });

  // If otherUser is not available, don't render the component
  if (!otherUser || !otherUser._id) {
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