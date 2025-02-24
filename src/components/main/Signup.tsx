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
    // Email format validation using regex
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    // Password length validation
    if (formData.password.length < 8 || formData.password.length > 50) {
      setError('Password must be between 8 and 50 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      console.log('[Debug] SignupForm - Sending verification request...');
      const response = await fetch('/api/auth/verify-email', {
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
      console.log('[Debug] SignupForm - Verification request response:', { status: response.status, message: data.message });

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }

      setShowVerification(true);
      setError('');
      setSuccess('Verification code sent to your email. Please check your inbox.');
    } catch (err: any) {
      console.error('[Debug] SignupForm - Verification request error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!formData.verificationCode) {
      setError('Please enter the verification code');
      setSuccess('');
      return;
    }

    try {
      setLoading(true);
      setSuccess(''); // Clear success message before verification
      console.log('[Debug] SignupForm - Verifying code and creating account...');
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          verificationCode: formData.verificationCode,
        }),
      });

      const data = await response.json();
      console.log('[Debug] SignupForm - Verification response:', { status: response.status, message: data.message });

      if (!response.ok) {
        if (response.status === 400 && data.message.includes('Invalid') || data.message.includes('expired')) {
          throw new Error(data.message);
        }
        throw new Error(data.message || 'Failed to create account');
      }

      console.log('[Debug] SignupForm - Account created successfully');
      setError(''); // Clear any existing error messages
      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    } catch (err: any) {
      console.error('[Debug] SignupForm - Verification error:', err);
      setSuccess(''); // Clear success message on error
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text={showVerification ? 'Verifying code...' : 'Sending code...'} />;
  }

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

      {/* Right Section: Sign Up Form */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-center px-8 md:px-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black">
            {showVerification ? 'Verify Your Email' : 'Create Your Account'}
          </h1>
          <p className="text-gray-600 mt-2">
            {showVerification ? 'Enter the verification code sent to your email' : 'Join PRICIO AI today'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-600 rounded-lg">
            {success}
          </div>
        )}

        <form className="space-y-4">
          {!showVerification ? (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  maxLength={50}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  minLength={8}
                  maxLength={50}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50"
              >
                Send Code
              </button>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  name="verificationCode"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={formData.verificationCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <button
                type="button"
                onClick={handleVerify}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50"
              >
                Create Account
              </button>
            </>
          )}

        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/signin" className="text-purple-600 hover:text-purple-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}