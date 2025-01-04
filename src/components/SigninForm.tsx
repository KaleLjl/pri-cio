'use client';
import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import GoogleIcon from '/public/image/google-icon.svg';
import LogoImage from '/public/image/logo.png';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

interface Props {
  dict: Dictionary;
}

function SignInContent({ dict }: Props) {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn('google', { 
      callbackUrl,
      prompt: 'select_account'
    });
    setLoading(false);
  };

  return (
    <div className="w-full md:w-1/2 bg-white flex flex-col justify-center px-8 md:px-16">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">{dict.signin.title}</h1>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex items-center justify-center w-full py-3 mb-4 border border-gray-300 rounded-lg bg-white hover:bg-purple-600 hover:text-white group transition"
      >
        <Image src={GoogleIcon} alt="Google" width={20} height={20} className="mr-2" />
        <span className="text-black group-hover:text-white">{dict.signin.google}</span>
      </button>
    </div>
  );
}

export default function SigninForm({ dict }: Props) {
  return (
    <div className="min-h-screen flex relative">
      {/* Logo Section */}
      <div className="absolute top-4 left-4 flex items-center space-x-2 z-50">
        <Link href="/" className="flex items-center space-x-2">
          <Image src={LogoImage} alt="Logo" width={40} height={40} />
          <span className="text-2xl font-bold text-white md:text-white text-black">PRICIO AI</span>
        </Link>
      </div>

      {/* Left Section: Visuals - Hidden on mobile */}
      <div className="hidden md:flex w-1/2 bg-black items-center justify-center">
        <div className="relative w-full h-full">
          <Image 
            src="/image/signin_image.jpg" 
            alt="Sample 1" 
            fill 
            className="object-cover" 
          />
        </div>
      </div>

      {/* Right Section: Login Form - Full width on mobile */}
      <Suspense fallback={<div>{dict.history.loading}</div>}>
        <SignInContent dict={dict} />
      </Suspense>
    </div>
  );
}