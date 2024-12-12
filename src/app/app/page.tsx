import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ImageCapture from '@/components/ImageCapture';

export default async function Home() {
  const session = await auth();
  if (!session) {
    redirect('/signin')
  }
  return (
    <div className="h-screen bg-black flex flex-col">
      <div className="h-12 flex items-center justify-center border-b border-gray-800">
        {/* Header content if needed */}
      </div>
      <main className="flex-1 flex flex-col">
        <ImageCapture />
      </main>
    </div>
  );
}