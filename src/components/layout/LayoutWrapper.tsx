'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/signin';

  return (
    <>
      {!isAuthPage && <Navigation />}
      <main className="min-h-screen">
        {children}
      </main>
      {!isAuthPage && <Footer />}
    </>
  );
} 