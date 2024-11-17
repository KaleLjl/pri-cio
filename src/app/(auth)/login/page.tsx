'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import '../../../css/login.css'; // Import the scoped CSS file
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
    <div className="login-page"> {/* Wrapper for scoping styles */}
      <div className="container">
        <div className="logo-name">
          <Image src={LogoName} alt="Logo Name" className="logo-name" />
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>

        <div className="footer">
          Don't have an account? <a href="/signup">Sign up here</a>.
        </div>
      </div>
    </div>
  );
}
