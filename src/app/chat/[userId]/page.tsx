'use client';

import { useParams } from 'next/navigation';

export default function ChatPage() {
  const params = useParams();
  const userId = params.userId as string;

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Chat</h1>
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="h-[600px] overflow-y-auto mb-4">
            {/* Chat messages will go here */}
            <div className="text-gray-400 text-center">
              Chat functionality coming soon...
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 