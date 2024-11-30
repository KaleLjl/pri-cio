'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LogoName from '../../../public/image/logo_name.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading, error } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signIn(email, password);
    if (success) {
      router.push('/');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-tr from-purple-600 to-purple-500">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center mb-4">
          <Image src={LogoName} alt="Logo Name" className="max-w-[200px] h-auto" />
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-3 py-2 mb-4 text-gray-900 border border-gray-300 rounded focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-3 py-2 mb-4 text-gray-900 border border-gray-300 rounded focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30"
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-2 px-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
          {error && <p className="mt-2 text-sm text-center text-red-500">{error}</p>}
        </form>

        <div className="mt-4 text-sm text-center text-gray-600">
          Don&apos;t have an account? <a href="/signup" className="font-bold text-purple-600 no-underline">Sign up here</a>.
        </div>
      </div>
    </div>
  );
}
