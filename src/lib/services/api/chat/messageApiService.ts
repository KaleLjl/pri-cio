import { MessageContent, ChatMessage } from '@/lib/types/chat';

export const messageApiService = {
  // Send a new message
  sendMessage: async (conversationId: string, content: MessageContent, receiverId: string): Promise<ChatMessage> => {
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        content,
        receiverId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  },

  // Get messages for a conversation
  getMessages: async (conversationId: string, before?: string) => {
    if (!conversationId) {
      throw new Error('No conversation ID');
    }
    
    const url = new URL('/api/chat/messages', window.location.origin);
    url.searchParams.append('conversationId', conversationId);
    
    if (before) {
      console.log(`Fetching messages before: ${before}`);
      url.searchParams.append('before', before);
    } else {
      console.log('Fetching initial messages');
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    const data = await response.json();
    console.log(`Fetched ${data.messages.length} messages, hasMore: ${data.hasMore}`);
    return data;
  },

  // Delete a message
  deleteMessage: async (messageId: string) => {
    const response = await fetch(`/api/chat/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete message');
    }

    return response.json();
  },

  // Delete all messages in a conversation
  deleteMessages: async (conversationId: string) => {
    const response = await fetch('/api/chat/messages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete messages');
    }

    return response.json();
  },

  // Mark messages as read in a conversation
  markAsRead: async (conversationId: string) => {
    const response = await fetch('/api/chat/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }

    return response.json();
  }
}; 