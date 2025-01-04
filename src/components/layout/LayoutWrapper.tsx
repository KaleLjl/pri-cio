'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

export default function LayoutWrapper({ 
  children,
  dict 
}: { 
  children: React.ReactNode;
  dict: Dictionary;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname?.endsWith('/signin');

  return (
    <>
      {!isAuthPage && <Navigation dict={dict} />}
      <main className="min-h-screen">
        {children}
      </main>
      {!isAuthPage && <Footer />}
    </>
  );
} 