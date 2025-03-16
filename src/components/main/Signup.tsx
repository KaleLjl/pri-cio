'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoImage from '/public/image/logo.png';
import Loading from '@/components/shared/Loading';

export default function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });

  // Debug logging for state changes
  useEffect(() => {
    console.log('State updated:', {
      showVerification,
      loading,
      error,
      formData: { ...formData, password: '[REDACTED]', confirmPassword: '[REDACTED]' }
    });
  }, [showVerification, loading, error, formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log('Input changed:', { field: name, value: name.includes('password') ? '[REDACTED]' : value });
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendCode = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    // Email format validation using regex
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation
    if (!formData.password) {
      setError('Please enter a password');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }

      setShowVerification(true);
      setSuccess('Verification code sent to your email');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!formData.verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: formData.verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="Processing..." />;
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/signin" className="font-medium text-purple-600 hover:text-purple-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {showVerification ? (
            <div className="space-y-6">
              {success && (
                <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                  {success}
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-white">
                  Verification Code
                </label>
                <div className="mt-1">
                  <input
                    id="verificationCode"
                    name="verificationCode"
                    type="text"
                    required
                    value={formData.verificationCode}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowVerification(false)}
                  className="text-sm text-purple-600 hover:text-purple-500"
                >
                  Back
                </button>
                <button
                  onClick={handleVerify}
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
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
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-gray-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-gray-700 text-white"
                  />
                </div>
              </div>

              <div>
                <button
                  onClick={handleSendCode}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}