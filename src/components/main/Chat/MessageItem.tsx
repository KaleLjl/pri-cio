import React from 'react';
import { format } from 'date-fns';
import { ChatMessage } from '@/lib/types/chat';
import { useLanguage } from '@/context/LanguageContext';

interface MessageItemProps {
  message: ChatMessage;
  userId: string;
  conversationId: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, userId }) => {
  const { dict } = useLanguage();

  return (
    <div
      className={`flex ${
        message.senderId === userId ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[70%] rounded-2xl p-4 ${
          message.senderId === userId
            ? 'bg-purple-600/90 backdrop-blur-sm shadow-lg hover:bg-purple-500/90 transition-colors'
            : 'bg-gray-700/90 backdrop-blur-sm shadow-lg hover:bg-gray-600/90 transition-colors'
        }`}
      >
        {typeof message.content === 'string' ? (
          <p className="text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
            {message.content}
          </p>
        ) : (
          <p className="text-sm text-gray-300 italic">
            Unsupported message type
          </p>
        )}
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-xs text-gray-300">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {message.senderId === userId && (
            <span className="text-xs text-gray-300">
              {message.status === 'sending' && dict.chat.status.sending}
              {message.status === 'sent' && dict.chat.status.sent}
              {message.status === 'delivered' && dict.chat.status.delivered}
              {message.status === 'read' && dict.chat.status.read}
              {message.status === 'error' && dict.chat.status.error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem; 