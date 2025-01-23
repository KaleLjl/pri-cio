import { Metadata } from 'next';
import ChatHistoryClient from '@/components/main/ChatHistory';

export default async function ChatHistoryPage() {
  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-black min-h-screen pt-16">
      <ChatHistoryClient />
    </main>
  );
} 