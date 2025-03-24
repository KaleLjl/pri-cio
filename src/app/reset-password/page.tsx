'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import LogoImage from '/public/image/logo.png';
import Loading from '@/components/shared/Loading';

function ResetPasswordContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get token from URL and validate it
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setError('Invalid password reset link. Please request a new one.');
      setTokenChecked(true);
      return;
    }
    
    setToken(tokenFromUrl);
    // Here we could add an API call to validate the token without revealing the associated email
    // For now, we'll just assume the token is valid if it exists
    setTokenValid(true);
    setTokenChecked(true);
  }, [searchParams]);
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };
  
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate passwords
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }
    
    if (password.length < 8 || password.length > 50) {
      setError('Password must be between 8 and 50 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }
      
      setSuccess('Password has been reset successfully!');
      
      // Redirect to sign in page after a short delay
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
    return <Loading text="Updating password..." />;
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
            alt="Reset Password" 
            fill 
            className="object-cover" 
          />
        </div>
      </div>
      
      {/* Right Section: Reset Password Form */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-center px-8 md:px-16">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black">Reset Your Password</h1>
          <p className="text-gray-600 mt-2">Enter a new password for your account</p>
        </div>
        
        {!tokenChecked ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : !tokenValid ? (
          <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg">
            {error || 'Invalid or expired reset link. Please request a new password reset.'}
            <div className="mt-4">
              <Link href="/signin" className="text-purple-600 hover:underline">
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
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
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                  required
                  minLength={8}
                  maxLength={50}
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600"
                  required
                  minLength={8}
                  maxLength={50}
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Reset Password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Main component that wraps the content in Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading text="Loading..." />}>
      <ResetPasswordContent />
    </Suspense>
  );
}