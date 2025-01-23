import Chat from '@/components/main/Chat';
import { Locale } from '@/lib/i18n/i18n-config';

export default async function ChatPage({
  params: { userId, lang }
}: {
  params: { userId: string; lang: Locale }
}) {
  return (
    <main className="flex-1 overflow-hidden">
      <Chat userId={userId} />
    </main>
  );
} 