'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import type { Dictionary } from '@/lib/i18n/types';

interface LayoutWrapperProps {
  children: React.ReactNode;
  dict: Dictionary;
}

export default function LayoutWrapper({ children, dict }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isAuthPage = pathname?.includes('/signin');
  const isAroundPage = pathname?.includes('/around'); 

  return (
    <>
      {!isAuthPage && <Navigation dict={dict} />}
      <main className="min-h-screen">
        {children}
      </main>
      {!isAuthPage && !isAroundPage && <Footer />}
    </>
  );
} 