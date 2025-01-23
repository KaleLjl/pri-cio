import { Metadata } from 'next';
import ChatHistoryClient from '@/components/main/ChatHistory';
import { Locale } from '@/lib/i18n/i18n-config';

export const metadata: Metadata = {
  title: 'Chat History - PRICIO AI',
  description: 'View your chat history and continue conversations',
};

export default async function ChatHistoryPage({
  params: { lang }
}: {
  params: { lang: Locale }
}) {
  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-black min-h-screen pt-16">
      <ChatHistoryClient />
    </main>
  );
} 