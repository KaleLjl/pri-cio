'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useChatHistory } from '@/lib/hooks/useChatHistory';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

export default function ChatHistoryClient() {
  const { data: session } = useSession();
  const { chats, loading, error } = useChatHistory();
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const formatDate = (dateString: string) => {
    try {
      // 将 UTC 时间字符串转换为本地时间
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data._id);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    if (session) {
      fetchCurrentUser();
    }
  }, [session]);

  if (!session) {
    return (
      <div className="text-center text-white">
        <p>Please sign in to view your chat history.</p>
        <Link href="/signin" className="text-blue-400 hover:text-blue-300">
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        Error loading chat history: {error.message}
      </div>
    );
  }

  if (!chats?.length) {
    return (
      <div className="text-white text-center p-8">
        <p className="mb-4">No chat history found.</p>
        <Link
          href="/explore"
          className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-500 transition-colors"
        >
          Find people to chat with
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Chat History</h1>
      <div className="space-y-4">
        {chats.map((chat) => {
          console.log('Chat data:', {
            chatId: chat._id,
            lastMessage: chat.lastMessage,
            createdAt: chat.createdAt
          });
          const otherParticipant = chat.participants.find(p => p._id !== currentUserId);
          if (!otherParticipant) return null;

          return (
            <Link
              key={chat._id}
              href={`/chat/${otherParticipant._id}`}
              className="block p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={otherParticipant.avatarUrl || '/default-avatar.png'}
                    alt={otherParticipant.name}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {otherParticipant.name}
                  </h3>
                  {chat.lastMessage && (
                    <p className="text-gray-300 text-sm truncate">
                      {chat.lastMessage.content}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-400 text-xs">
                    {formatDate(chat.lastMessage?.createdAt || chat.createdAt)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 