'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useChat } from '@/lib/hooks/useChat';
import { ChatUser } from '@/lib/types/chat';
import { useSession } from 'next-auth/react';

interface ChatProps {
  userId: string;
}

export default function Chat({ userId }: ChatProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (status !== 'authenticated') return;
      
      try {
        // Get current user's ID first
        const currentUserResponse = await fetch('/api/users/me');
        if (!currentUserResponse.ok) {
          throw new Error('Failed to fetch current user');
        }

        const currentUserData = await currentUserResponse.json();
        setCurrentUserId(currentUserData._id);

        // Get other user's profile
        const userResponse = await fetch(`/api/users/${userId}`);
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const userData = await userResponse.json();
        setOtherUser({
          _id: userId,
          name: userData.name,
          avatarUrl: userData.avatarUrl,
        });

        // Create or get conversation
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: userId }),
        });

        if (!response.ok) {
          throw new Error('Failed to initialize chat');
        }

        const data = await response.json();
        setConversationId(data._id);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize chat');
      } finally {
        setIsInitializing(false);
      }
    };

    if (userId) {
      initializeChat();
    }
  }, [userId, status]);

  // Initialize chat hook only when we have all required data
  const chat = useChat(
    currentUserId && otherUser && conversationId
      ? {
          conversationId,
          currentUserId,
          otherUser,
        }
      : null
  );

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chat.messages.length > 0) {
      scrollToBottom();
    }
  }, [chat.messages]);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center h-[600px] space-y-4">
            <div className="text-xl text-red-500">{error}</div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isInitializing || !otherUser) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-[600px]">
            <div className="text-xl">Loading chat...</div>
          </div>
        </div>
      </div>
    );
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chat.inputMessage.trim()) {
      chat.sendMessage(chat.inputMessage.trim());
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Chat Header */}
        <div className="flex items-center space-x-4 mb-4 p-4 bg-gray-900 rounded-lg">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-800 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div className="relative w-12 h-12 rounded-full overflow-hidden">
            <Image
              src={otherUser.avatarUrl || '/default-avatar.png'}
              alt={otherUser.name || 'User'}
              layout="fill"
              objectFit="cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">{otherUser.name || 'User'}</h1>
            {chat.isTyping && (
              <p className="text-sm text-purple-400">typing...</p>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="h-[500px] overflow-y-auto mb-4 space-y-4">
            {chat.messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${
                  message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.senderId === currentUserId
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chat.inputMessage}
              onChange={(e) => chat.setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              type="submit"
              disabled={!chat.inputMessage.trim()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 