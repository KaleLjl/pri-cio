'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import GoogleIcon from '/public/image/google-icon.svg';
import LogoImage from '/public/image/logo.png';
import Loading from '@/components/shared/Loading';

// Separate component for handling search params
function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn('google', { 
      callbackUrl,
      prompt: 'select_account'
    });
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        callbackUrl,
        redirect: false, // Change to false to handle the redirect manually
      });

      if (result?.error) {
        switch (result.error) {
          case 'CredentialsSignin':
            setError('Invalid email or password. Please check your credentials.');
            break;
          case 'Email not found':
            setError('This email is not registered. Please sign up first.');
            break;
          default:
            setError(result.error);
        }
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (err) {
      setError('An error occurred during sign in. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Signing in..." />;
  }

  return (
    <div className="w-full md:w-1/2 bg-white flex flex-col justify-center px-8 md:px-16">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Continue to PRICIO AI</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleEmailSignIn} className="space-y-4 mb-4">
        <div>
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            name="email"
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            name="password"
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Sign In
        </button>
      </form>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex items-center justify-center w-full py-3 border border-gray-300 rounded-lg bg-white hover:bg-purple-600 hover:text-white group transition"
      >
        <Image src={GoogleIcon} alt="Google" width={20} height={20} className="mr-2" />
        <span className="text-black group-hover:text-white">Sign in with Google</span>
      </button>

      <p className="mt-4 text-center text-gray-600">
        Don't have an account?{' '}
        <Link href="/signup" className="text-purple-600 hover:text-purple-700">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function SigninForm() {
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
      <Suspense fallback={<div>Loading...</div>}>
        <SignInContent />
      </Suspense>
    </div>
  );
}