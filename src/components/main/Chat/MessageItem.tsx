import React from 'react';
import { format } from 'date-fns';
import { useChat } from '@/context/ChatContext';
import ObjectDiscussion_Displayed from '@/components/main/Chat/Chat-Component/ObjectDiscussion_Displayed';
import { ObjectDiscussionData } from '@/lib/types/chat';

interface MessageItemProps {
  message: any; // Replace with proper type when available
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { 
    currentUserId,
    myPosts,
    userPosts,
    messages,
    isLastDiscussionMessage,
    isPostFinalized,
    isCurrentUserSeller,
    handleObjectDiscussionClick,
    handleDealComplete,
    handleCancelDiscussion,
    isSending,
    dict
  } = useChat();

  return (
    <div
      className={`flex ${
        message.senderId === currentUserId ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[70%] rounded-2xl p-4 ${
          message.senderId === currentUserId
            ? 'bg-purple-600/90 backdrop-blur-sm shadow-lg hover:bg-purple-500/90 transition-colors'
            : 'bg-gray-700/90 backdrop-blur-sm shadow-lg hover:bg-gray-600/90 transition-colors'
        }`}
      >
        {typeof message.content === 'string' ? (
          <p className="text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
            {message.content}
          </p>
        ) : message.content.type === 'object_discussion' ? (
          <ObjectDiscussion_Displayed
            content={message.content as ObjectDiscussionData}
            senderId={message.senderId}
            currentUserId={currentUserId || ''}
            myPosts={myPosts}
            userPosts={userPosts}
            isLastDiscussionMessage={(msg) => isLastDiscussionMessage(msg, messages)}
            isPostFinalized={(postId, discussingId) => isPostFinalized(postId, discussingId, messages)}
            isCurrentUserSeller={(postId) => isCurrentUserSeller(postId, myPosts, userPosts)}
            handleObjectDiscussionClick={handleObjectDiscussionClick}
            handleDealComplete={handleDealComplete}
            handleCancelDiscussion={handleCancelDiscussion}
            isSending={isSending}
            messages={messages}
          />
        ) : null}
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-xs text-gray-300">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {message.senderId === currentUserId && (
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