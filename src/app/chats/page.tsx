'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { format } from 'date-fns';

interface Conversation {
  _id: string;
  participants: {
    _id: string;
    name: string;
    avatarUrl?: string;
  }[];
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  updatedAt: string;
}

export default function Chats() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (status !== 'authenticated') return;

      try {
        const response = await fetch('/api/chat/conversations', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }

        const data = await response.json();
        setConversations(data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch conversations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [status]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center pt-16">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <div className="text-xl">Loading conversations...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center pt-16">
        <div className="text-center">
          <div className="text-xl text-red-500 mb-4">{error}</div>
          <button
            onClick={() => router.refresh()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center pt-16">
        <div className="text-center">
          <div className="text-xl mb-4">No conversations yet</div>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
          >
            Find People
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-16">
      <div className="container max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <div className="space-y-4">
          {conversations.map((conversation) => {
            const otherParticipant = conversation.participants.find(
              (p) => p._id !== session?.user?.id
            );

            if (!otherParticipant) return null;

            return (
              <div
                key={conversation._id}
                onClick={() => router.push(`/chat/${otherParticipant._id}`)}
                className="flex items-center space-x-4 p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors"
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-500/50">
                  <Image
                    src={otherParticipant.avatarUrl || '/default-avatar.png'}
                    alt={otherParticipant.name}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg font-semibold truncate">
                      {otherParticipant.name}
                    </h2>
                    {conversation.lastMessage && (
                      <span className="text-xs text-gray-400">
                        {format(new Date(conversation.lastMessage.createdAt), 'MMM d, HH:mm')}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <p className="text-sm text-gray-400 truncate">
                      {conversation.lastMessage.senderId === session?.user?.id ? 'You: ' : ''}
                      {conversation.lastMessage.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 