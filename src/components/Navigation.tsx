'use client'
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import Image from 'next/image';
import LogoImage from '../public/image/logo.png';
import LogoName from '../public/image/logo_name.png';
import '../css/navigation.css';


interface NavItem {
  label: string;
  href: string;
}

interface NavigationProps {
  logo?: string;
  navItems?: NavItem[];
}

const Navigation: React.FC<NavigationProps> = ({ 
  logo = "Logo"
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { user, signOut } = useAuth();

  const navItems: NavItem[] = user ? [
    {label: 'History', href:'/history'},
    { label: user.email || 'User', href: '/setting' },
    { label: 'Sign Out', href: '/login' }
  ] : [
    { label: 'Login', href: '/login' },
    { label: 'Signup', href: '/signup'},
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.label === 'Sign Out') {
      signOut();
    }
    setIsOpen(false);
  };

  return (
    <nav className="bg-background border-b border-foreground/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <Image src={LogoImage} alt="Logo" width={50} height={50} />
              <Image src={LogoName} alt="Logo Name" className="navigation-logo-name" />
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:text-foreground/70 transition-colors duration-200"
                  onClick={() => handleNavClick(item)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md hover:text-foreground/70"
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
                  d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md hover:bg-foreground/10 transition-colors duration-200"
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