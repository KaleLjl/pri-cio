import Chat from "@/components/main/Chat";
import { ChatProvider } from "@/lib/context/ChatContext"; // Import the provider

export default async function ChatPage({
  params,
}: {
  params: { userId: string };
}) {
  const { userId } = await params;
  return (
    <main className="flex-1 overflow-hidden">
      <ChatProvider userId={userId}>
        {/* Remove userId prop from Chat component */}
        <Chat key={userId} />
      </ChatProvider>
    </main>
  );
}
