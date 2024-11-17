'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LogoName from '../../../public/image/logo_name.png';
import '../../../css/signup.css'; 

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
    <div className="signup-page"> {/* Add the wrapper class */}
      <div className="container">
        <div className="logo">
          <Image src={LogoName} alt="Logo Name" />
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
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>

        <div className="social-buttons">
          <div className="social-button">Continue with Google</div>
          <div className="social-button">Continue with TikTok</div>
          <div className="social-button">Continue with Facebook</div>
          <div className="social-button">Continue with Email</div>
        </div>

        <div className="footer">
          By continuing, you agree to the <a href="#">Terms of Service</a> and{' '}
          <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}

