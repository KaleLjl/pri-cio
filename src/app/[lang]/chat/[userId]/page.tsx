import Chat from '@/components/main/Chat';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { Locale } from '@/lib/i18n/i18n-config';

export default async function ChatPage({
  params: { userId, lang }
}: {
  params: { userId: string; lang: Locale }
}) {
  const dict = await getDictionary(lang);
  
  return (
    <main className="flex-1 overflow-hidden">
      <Chat userId={userId} dict={dict} />
    </main>
  );
} 