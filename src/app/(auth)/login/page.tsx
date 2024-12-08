'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import LogoName from '/public/image/logo_name.png';
import GoogleIcon from '/public/image/google-icon.svg';
import { signIn } from 'next-auth/react';

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/app';

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } catch (err) {
      setError('Google登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-tr from-purple-600 to-purple-500">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center mb-4">
          <Image src={LogoName} alt="Logo Name" className="max-w-[200px] h-auto" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mt-4 py-2 px-3 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          <Image
            src={GoogleIcon}
            alt="Google"
            width={20}
            height={20}
            className="mr-2"
          />
          使用Google登录
        </button>
        {error && <p className="mt-2 text-sm text-center text-red-500">{error}</p>}
      </div>
    </div>
  );
}
