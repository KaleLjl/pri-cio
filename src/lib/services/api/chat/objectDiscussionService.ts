import { ObjectDiscussionFormData } from '@/lib/types/objectDiscussion';
import { ObjectDiscussionData } from '@/lib/types/chat';

export const objectDiscussionApiService = {
  // Complete a deal for an object discussion
  completeDeal: async (discussionData: ObjectDiscussionData) => {
    const response = await fetch('/api/chat/deal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discussionData),
    });

    if (!response.ok) {
      throw new Error('Failed to complete deal');
    }

    return response.json();
  },

  // Update object discussion status
  updateDiscussionStatus: async (discussionId: string, status: string) => {
    const response = await fetch(`/api/chat/discussions/${discussionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update discussion status');
    }

    return response.json();
  },

  // Cancel an object discussion
  cancelDiscussion: async (discussionId: string) => {
    const response = await fetch(`/api/chat/discussions/${discussionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to cancel discussion');
    }

    return response.json();
  },

  // Get discussion details
  getDiscussionDetails: async (discussionId: string) => {
    const response = await fetch(`/api/chat/discussions/${discussionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch discussion details');
    }

    return response.json();
  }
}; 