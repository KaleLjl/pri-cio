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
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
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

  const handleResetEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResetEmail(e.target.value);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    // Email format validation using regex
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(resetEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset link');
      }

      // Show success message
      alert(`Password reset link sent to ${resetEmail}. Please check your email.`);
      setShowResetPassword(false); // Return to sign in form
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
        callbackUrl,
      });

      if (!result?.error) {
        router.push(callbackUrl);
      } else {
        setError('Invalid email or password');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Signing in..." />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src={LogoImage}
            alt="Logo"
            width={100}
            height={100}
            className="mx-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Or{' '}
          <Link href="/signup" className="font-medium text-purple-600 hover:text-purple-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {showResetPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-white">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="resetEmail"
                    name="resetEmail"
                    type="email"
                    autoComplete="email"
                    required
                    value={resetEmail}
                    onChange={handleResetEmailChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-gray-700 text-white"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="text-sm text-purple-600 hover:text-purple-500"
                >
                  Back to sign in
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="space-y-6">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <Image
                    src={GoogleIcon}
                    alt="Google Icon"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  Sign in with Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-gray-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-white">
                      Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-gray-700 text-white"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-red-500 text-sm">{error}</div>
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-sm text-purple-600 hover:text-purple-500"
                    >
                      Forgot your password?
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<Loading text="Loading..." />}>
      <SignInContent />
    </Suspense>
  );
}