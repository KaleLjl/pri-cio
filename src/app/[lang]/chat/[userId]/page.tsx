import Chat from '@/components/main/Chat';

export default async function ChatPage({
  params,
}: {
  params: { userId: string }
}) {
  const { userId } = await params;
  
  return (
    <main className="flex-1 overflow-hidden">
      <Chat userId={userId} />
    </main>
  );
} 