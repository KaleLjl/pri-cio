'use client';
import { useEffect, useState } from 'react';

const Footer = () => {
  const [isImageCapturePage, setIsImageCapturePage] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsImageCapturePage(window.location.pathname === '/app');
    }
  }, []);

  return (
    <footer className={`w-full py-4 text-center bg-black border-t border-gray-600 text-gray-600 ${
      isImageCapturePage ? 'fixed bottom-0' : ''
    }`}>
      <div className="flex justify-center items-center gap-4">
        <p>Contact: hello@pri-cio.co.uk</p>
        <p className="text-sm">© {year} All Rights Reserved</p>
      </div>
    </footer>
  );
};

export default Footer;


