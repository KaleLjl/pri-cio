import Chat from '@/components/main/Chat';

export default async function ChatPage({ params }: any) {
  const { userId } = params;
  
  return (
    <main className="flex-1 overflow-hidden">
      <Chat key={userId} userId={userId} />
    </main>
  );
}