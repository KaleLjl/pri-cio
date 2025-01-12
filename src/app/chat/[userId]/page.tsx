import Chat from '@/components/main/Chat';

interface Props {
  params: Promise<{
    userId: string;
  }>;
}

export default async function ChatPage({ params }: Props) {
  const { userId } = await params;
  return <Chat userId={userId} />;
} 