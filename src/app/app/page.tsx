import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ImageCapture from '@/components/ImageCapture';

export default async function Home() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="h-screen bg-black flex flex-col items-center px-4 space-y-4 pt-4 justify-center">
      <div className="w-full flex justify-center pt-4 pb-2">
      </div>
      <ImageCapture />
    </div>
  );
}