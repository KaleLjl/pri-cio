'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import { useEffect, useState } from 'react';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/signin';
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = '/video/bg1.mp4';
    video.preload = 'auto';
    video.oncanplaythrough = () => {
      setIsVideoReady(true);
    };
    video.load();
  }, []);

  if (!isVideoReady) {
    // Render a full-page loader while video is loading
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-black z-50">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {!isAuthPage && <Navigation />}
      {children}
      {!isAuthPage && <Footer />}
    </>
  );
} 