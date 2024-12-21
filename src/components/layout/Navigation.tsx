'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import LogoImage from '/public/image/logo.png';
import { FaSearch } from 'react-icons/fa';

interface NavItem {
  label: string;
  href: string;
}

const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems: NavItem[] = session
    ? [
        { label: session.user?.email || 'Dashboard', href: '#' },
        { label: 'App', href: '/app' },
        { label: 'History', href: '/history' },
        { label: 'Sign out', href: '/' },
      ]
    : [
        { label: 'Explore', href: '/explore' },
        { label: 'Sign in', href: '/signin' }
      ];

  const handleNavClick = async (item: NavItem) => {
    if (item.label === 'Sign out') {
      await signOut();
      window.location.href = '/';
      return;
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black bg-opacity-50 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <Image src={LogoImage} alt="Logo" width={50} height={50} />
              <span className="text-2xl font-bold text-white">
                PRICIO AI
              </span>
            </Link>
          </div>

          {/* Search Bar - Only on Explore Page */}
          {pathname === '/explore' && (
            <div className="flex-grow flex justify-center">
              <div className="relative w-full max-w-md">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 px-4 py-2 rounded-md border border-gray-300 bg-transparent focus:outline-none focus:border-gray-500 w-full"
                />
              </div>
              <Link href="/around" className="ml-4">
                <button className="px-4 py-2 rounded-md bg-transparent border text-white hover:bg-gray-500">
                  Around
                </button>
              </Link>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white hover:text-gray-300 transition-colors duration-200"
                  onClick={() => handleNavClick(item)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-gray-300"
            >
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isOpen
                      ? 'M6 18L18 6M6 6l12 12'
                      : 'M4 6h16M4 12h16M4 18h16'
                  }
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md text-white hover:bg-gray-700 transition-colors duration-200"
                onClick={() => handleNavClick(item)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;



