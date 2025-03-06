import { useState, useCallback } from 'react';

interface Message {
  role: string;
  content: string;
}

interface PostData {
  description: string;
  price: string;
}

interface AIResponse {
  reply?: string;
  detailedDescription?: string;
  postData?: PostData;
}

export interface UploadAIChatState {
  conversation: Message[];
  isLoading: boolean;
  errorMessage: string | null;
}

export interface UploadAIChatActions {
  sendMessage: (message: string, imageUrl: string, currency: string) => Promise<AIResponse>;
  clearConversation: () => void;
  handleInitialAnalysis: (imageUrl: string, currency: string) => Promise<AIResponse>;
}

export const useUploadAIChat = (): [UploadAIChatState, UploadAIChatActions] => {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    imageUrl: string,
    currency: string
  ): Promise<AIResponse> => {
    const updatedConversation = [...conversation, { role: 'user', content: message }];
    setConversation(updatedConversation);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          conversation: updatedConversation,
          imageUrl,
          currency
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to communicate with AI');
      }

      const data: AIResponse = await response.json();

      if (data.reply) {
        setConversation(prev => [...prev, { role: 'assistant', content: data.reply as string }]);
      }

      return data;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [conversation]);

  const handleInitialAnalysis = useCallback(async (
    imageUrl: string,
    currency: string,
  ): Promise<AIResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageUrl,
          currency,
          isInitialAnalysis: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data: AIResponse = await response.json();

      if (data.detailedDescription) {
        setConversation([
          { role: 'assistant', content: data.detailedDescription }
        ]);
      }

      return data;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      setConversation([
        { role: 'assistant', content: 'Sorry, I encountered an error analyzing the image. Please try asking me about it.' }
      ]);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setErrorMessage(null);
  }, []);

  return [
    { conversation, isLoading, errorMessage },
    { sendMessage, clearConversation, handleInitialAnalysis }
  ];
}; 