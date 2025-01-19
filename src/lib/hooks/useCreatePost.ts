import { useState } from 'react';

interface ChatMessage {
  sender: 'user' | 'gpt';
  text: string;
}

interface CreatePostPayload {
  description: string;
  images?: string[]; // Include images in the payload
}

export function useCreatePost() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessageToGPT = async (description: string, images?: string[]) => {
    setLoading(true);
    setError(null);

    const userMessage: ChatMessage = { sender: 'user', text: description };
    setChatMessages((prev) => [...prev, userMessage]);

    try {
      const payload: CreatePostPayload = { description, images };

      const response = await fetch('/api/createpost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`Failed to communicate with GPT: ${errorDetails}`);
      }

      const data = await response.json();

      const gptMessage: ChatMessage = { sender: 'gpt', text: data.message };
      setChatMessages((prev) => [...prev, gptMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { chatMessages, sendMessageToGPT, loading, error };
}
