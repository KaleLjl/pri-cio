import Chat from '@/components/main/Chat';

export default async function ChatPage({
  params: { userId }
}: {
  params: { userId: string }
}) {
  return (
    <main className="flex-1 overflow-hidden">
      <Chat userId={userId} />
    </main>
  );
} 