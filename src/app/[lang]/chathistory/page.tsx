import { Metadata } from 'next';
import ChatHistoryClient from '@/components/main/ChatHistory';
import { getDictionary } from '@/lib/i18n/get-dictionary';
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
  const dict = await getDictionary(lang);
  
  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-black min-h-screen pt-16">
      <ChatHistoryClient dict={dict} />
    </main>
  );
} 