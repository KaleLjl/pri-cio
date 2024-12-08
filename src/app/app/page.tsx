import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import LogoName from '/public/image/logo_name.png';
import ImageCapture from '@/components/ImageCapture';

export default async function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 overflow-y-auto pb-12 flex flex-col items-center px-4 space-y-4 pt-4">
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