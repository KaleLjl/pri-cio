import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import LogoName from '../public/image/logo_name.png';
import ImageCapture from '@/components/ImageCapture';

export default async function Home() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen overflow-y-auto pb-12 flex flex-col items-center px-4 space-y-4 pt-4 relative">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover -z-10"
      >
        <source src="/video/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Logo */}
      <div className="w-full flex justify-center pt-4 pb-2">
        <Image 
          src={LogoName} 
          alt="PRI-CIO Logo" 
          className="w-[400px] h-auto mb-1"
        />
      </div>
      
      <ImageCapture />
    </div>
  );
}