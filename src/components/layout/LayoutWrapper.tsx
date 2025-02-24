'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isAuthPage = pathname?.includes('/signin');
  const isAroundPage = pathname?.includes('/around'); 
  const isSignupPage = pathname?.includes('/signup');

  return (
    <>
      {!isAuthPage && !isSignupPage && <Navigation />}
      <main className="min-h-screen">
        {children}
      </main>
      {!isAuthPage && !isAroundPage && !isSignupPage && <Footer />}
    </>
  );
} 