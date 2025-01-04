'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import LogoImage from '/public/image/logo.png';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import { i18n } from '@/lib/i18n/config';

interface Props {
  dict: Dictionary;
}

interface NavItem {
  label: string;
  href: string;
}

const LanguageSwitcher = ({ currentLang, onChange, dict }: { 
  currentLang: string; 
  onChange: (lang: string) => void;
  dict: Dictionary;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors duration-200"
      >
        <span className="font-normal">
          {currentLang === 'zh' ? '语言' : 'Language'}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 py-1 w-24 bg-black bg-opacity-90 backdrop-blur-lg rounded-lg shadow-lg ring-1 ring-white ring-opacity-20"
          onMouseLeave={() => setIsOpen(false)}
        >
          {i18n.locales.map((locale) => (
            <button
              key={locale}
              onClick={() => {
                onChange(locale);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 ${
                currentLang === locale 
                  ? 'text-purple-400 bg-white bg-opacity-10' 
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              } transition-colors duration-200`}
            >
              {locale.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Navigation = ({ dict }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  // 获取当前语言和路径
  const currentLang = pathname?.split('/')[1] || 'en';
  const pathWithoutLang = pathname?.split('/').slice(2).join('/') || '';

  const navItems = session
    ? [
        { label: session.user?.email || 'Dashboard', href: '#' },
        { label: dict.navigation.app, href: `/${currentLang}/app` },
        { label: dict.navigation.history, href: `/${currentLang}/history` },
        { label: dict.navigation.signout, href: '/' },
      ]
    : [
        { label: dict.navigation.signin, href: `/${currentLang}/signin` }
      ];

  // 语言切换处理
  const handleLanguageChange = (lang: string) => {
    // 构建新的URL路径
    const newPath = `/${lang}/${pathWithoutLang}`;
    window.location.href = newPath;
  };

  const handleNavClick = async (item: NavItem) => {
    if (item.label === dict.navigation.signout) {
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
            <Link href={`/${currentLang}`} className="flex items-center space-x-2">
              <Image src={LogoImage} alt="Logo" width={50} height={50} />
              <span className="text-2xl font-bold text-white">
                PRICIO AI
              </span>
            </Link>
          </div>

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
              
              {/* 传递 dict 到 LanguageSwitcher */}
              <LanguageSwitcher 
                currentLang={currentLang} 
                onChange={handleLanguageChange}
                dict={dict}
              />
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
            
            {/* 移动端语言切换 */}
            <LanguageSwitcher 
              currentLang={currentLang} 
              onChange={handleLanguageChange}
              dict={dict}
            />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;



