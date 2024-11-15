'use client'
import { useState } from 'react';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
}

interface NavigationProps {
  logo?: string;
  navItems?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Login', href: '/login' },
  { label: 'Register', href: '/register' },
];

const Navigation: React.FC<NavigationProps> = ({ 
  logo = "Logo", 
  navItems = defaultNavItems 
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleMenu = (): void => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-background border-b border-foreground/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold">
              {logo}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {navItems.map((item: NavItem) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:text-foreground/70 transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md hover:text-foreground/70"
              aria-expanded={isOpen}
              aria-label="Toggle navigation menu"
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

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item: NavItem) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md hover:bg-foreground/10 transition-colors duration-200"
                onClick={() => setIsOpen(false)}
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