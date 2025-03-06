import React, { useState, useEffect } from 'react';
import { useSocketContext } from '@/lib/context/NewSocketContext';
import { useSocketMessages } from '@/app/api/users/hooks/chat/socket/useSocketMessages';
import { useConversation } from '@/lib/hooks/chat/socket/useConversation';

interface TestChatComponentProps {
  conversationId: string;
  userId: string;
  otherUserId: string;
}

export function TestChatComponent({
  conversationId,
  userId,
  otherUserId
}: TestChatComponentProps) {
  const [messageText, setMessageText] = useState('');
  
  // Global socket operations from context
  const { isConnected } = useSocketContext();
  
  // Message-specific operations
  const {
    handleMessageSubmit,
    handleTyping,
    isTyping,
    isSending
  } = useSocketMessages({
    conversationId,
    userId
  });
  
  // Conversation-level operations
  const {
    handleMarkAsRead,
    isLoading: isMarkingRead,
    inConversation
  } = useConversation({
    conversationId,
    userId
  });

  // Handle message submission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    const messageId = await handleMessageSubmit(messageText, otherUserId);
    if (messageId) {
      setMessageText('');
    }
  };

  // Handle typing
  const onMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    handleTyping(true);
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="mb-4">
        <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
        <p>In Conversation: {inConversation ? 'Yes' : 'No'}</p>
        {isTyping && <p>Typing...</p>}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <textarea
            value={messageText}
            onChange={onMessageChange}
            placeholder="Type your message..."
            className="w-full p-2 border rounded"
            disabled={!isConnected || !inConversation}
          />
        </div>

        <div className="flex justify-between">
          <button
            type="submit"
            disabled={!isConnected || !inConversation || isSending}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>

          <button
            type="button"
            onClick={handleMarkAsRead}
            disabled={!isConnected || !inConversation || isMarkingRead}
            className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
          >
            {isMarkingRead ? 'Marking as Read...' : 'Mark as Read'}
          </button>
        </div>
      </form>
    </div>
  );
} 