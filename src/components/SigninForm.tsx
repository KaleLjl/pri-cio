'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import GoogleIcon from '/public/image/google-icon.svg';
import LogoImage from '/public/image/logo.png';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SigninForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { 
        callbackUrl,
        prompt: 'select_account'
      });
    } catch (err) {
      setError('Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Logo Section */}
      <div className="absolute top-4 left-4 flex items-center space-x-2 z-50">
        <Link href="/" className="flex items-center space-x-2">
          <Image src={LogoImage} alt="Logo" width={40} height={40} />
          <span className="text-2xl font-bold text-white">PRICIO AI</span>
        </Link>
      </div>

      {/* Left Section: Visuals */}
      <div className="w-1/2 bg-black flex items-center justify-center">
        <div className="relative w-full h-full">
          <Image 
            src="/image/signin_image.jpg" 
            alt="Sample 1" 
            fill 
            className="object-cover" 
          />
        </div>
      </div>

      {/* Right Section: Login Form */}
      <div className="w-1/2 bg-white flex flex-col justify-center px-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black">Continue to PRICIO AI</h1>
          <p className="text-sm text-gray-500 mt-2">
            By signing up, you acknowledge and agree to our{' '}
            <a href="/terms" className="text-blue-500 underline">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-500 underline">Privacy Policy</a>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center justify-center w-full py-3 mb-4 border border-gray-300 rounded-lg bg-white hover:bg-purple-600 hover:text-white group transition"
        >
          <Image src={GoogleIcon} alt="Google" width={20} height={20} className="mr-2" />
          <span className="text-black group-hover:text-white">Sign in with Google</span>
        </button>

        {error && <p className="mt-4 text-sm text-center text-red-500">{error}</p>}

        <div className="mt-4">
          <label className="flex items-center text-sm text-gray-500">
            <input
              type="checkbox"
              className="mr-2 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
            I do not wish to receive promotions and updates from PRICIO AI
          </label>
        </div>
      </div>
    </div>
  );
}