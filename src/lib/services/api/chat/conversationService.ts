import { ChatUser } from '@/lib/types/chat';

export const conversationApiService = {
  // Initialize or get a conversation with another user
  initializeConversation: async (participantId: string) => {
    const response = await fetch('/api/chat/conversations/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize conversation');
    }

    const data = await response.json();
    
    // Transform the response to the expected structure
    // This handles both potential response formats
    return {
      conversationId: data.conversationId || data._id,
      currentUserId: data.currentUserId,
      otherUser: data.otherUser || data.participants?.find((p: ChatUser) => p._id !== data.currentUserId)
    };
  },

  // Get conversation details
  getConversation: async (conversationId: string) => {
    const response = await fetch(`/api/chat/conversations/${conversationId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch conversation');
    }

    return response.json();
  },

  // Get all conversations for current user
  getConversations: async () => {
    const response = await fetch('/api/chat/conversations/list');
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }

    return response.json();
  },

  // Update conversation settings
  updateConversationSettings: async (conversationId: string, settings: any) => {
    const response = await fetch(`/api/chat/conversations/${conversationId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('Failed to update conversation settings');
    }

    return response.json();
  }
}; 