'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LogoName from '../../../public/image/logo_name.png';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, loading, error } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const data = await signUp(email, password);
    if (data) {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-tr from-purple-600 to-purple-500 text-white font-sans m-0 p-0">
      <div className="max-w-[480px] w-full bg-white rounded-lg p-8 shadow-lg text-black mx-4">
      <div className="flex justify-center mb-4">
          <Image src={LogoName} alt="Logo Name" className="max-w-[200px] h-auto" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full p-3 border border-gray-300 rounded-md text-base text-gray-900 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full p-3 border border-gray-300 rounded-md text-base text-gray-900 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            required
            className="w-full p-3 border border-gray-300 rounded-md text-base text-gray-900 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full p-3 bg-purple-600 text-white rounded-md text-base cursor-pointer transition-colors hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
          {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
        </form>
        <div className="mt-4 text-center text-sm text-gray-500">
          {/* Footer content */}
        </div>
      </div>
    </div>
  );
}

