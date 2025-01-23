'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import LogoImage from '/public/image/logo.png';
import { FaSearch, FaGlobe } from 'react-icons/fa';
import { Avatar, Menu, MenuItem } from '@mui/material';
import { i18n } from '@/lib/i18n/i18n-config';
import type { Dictionary } from '@/lib/i18n/types';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { useLanguage } from '@/lib/context/LanguageContext';

interface NavItem {
  label: string | JSX.Element;
  href: string;
}

const Navigation: React.FC = () => {
  const { dict } = useLanguage();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const router = useRouter();

  // 获取当前语言
  const currentLang = pathname?.split('/')[1] || 'en';

  // 处理语言菜单
  const handleLanguageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = (lang: string) => {
    const newPathname = pathname.replace(`/${currentLang}`, `/${lang}`);
    router.push(newPathname);
    handleLanguageClose();
  };

  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch(`/api/editprofile`);
          if (!response.ok) {
            throw new Error(`Failed to fetch user profile: ${response.statusText}`);
          }
          const profiles = await response.json();
          const userProfile = profiles.find((profile: { email: string }) => profile.email === session.user?.email);

          if (userProfile?.avatarUrl) {
            setCurrentAvatarUrl(userProfile.avatarUrl);
          } else {
            setCurrentAvatarUrl(null);
          }
        } catch (error) {
          console.error('Error fetching user avatar:', error);
          setCurrentAvatarUrl(null);
        }
      }
    };

    fetchUserAvatar();
  }, [session?.user?.email]);

  const emailInitial = session?.user?.email?.charAt(0).toUpperCase() || 'U';

  const navItems: NavItem[] = session
    ? [
        { label: dict.navigation.explore, href: `/${currentLang}/explore` },
        { label: dict.navigation.app, href: `/${currentLang}/app` },
        { label: dict.navigation.messages || 'Messages', href: `/${currentLang}/chathistory` },
        { label: dict.navigation.createpost || 'Create Post', href: `/${currentLang}/createpost` },
        { label: dict.navigation.signout, href: '/' },
        { 
          label: (
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <ImageWithFallback
                src={currentAvatarUrl || ''}
                alt={session?.user?.name || emailInitial}
                layout="fill"
                objectFit="cover"
                isAvatar={true}
              />
            </div>
          ), 
          href: `/${currentLang}/history` 
        },
      ]
    : [
        { label: dict.navigation.explore, href: `/${currentLang}/explore` },
        { label: dict.navigation.signin, href: `/${currentLang}/signin` }
      ];

  const handleNavClick = async (item: NavItem) => {
    if (item.label === dict.navigation.signout) {
      await signOut();
      window.location.href = '/';
      return;
    }
    setIsOpen(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Update the URL dynamically if on the Explore page
    if (pathname === `/${currentLang}/explore`) {
      router.push(`/${currentLang}/explore?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black bg-opacity-50 backdrop-blur-lg">
      <div className="px-4 sm:px-6 lg:px-8">
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

          {/* Search Bar - Only on Explore Page */}
          {pathname.includes('/explore') && (
            <div className="flex-grow flex justify-center">
              <div className="relative w-full max-w-xs">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={dict.navigation.search || "Search..."}
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10 px-4 py-2 rounded-md border border-gray-300 bg-transparent focus:outline-none focus:border-gray-500 w-full text-white placeholder-gray-400"
                />
              </div>
              <Link href={`/${currentLang}/around`} className="ml-4">
                <button className="px-4 py-2 rounded-md bg-transparent border text-white hover:bg-gray-500">
                  {dict.navigation.around}
                </button>
              </Link>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {/* Language Selector */}
              <div
                onClick={handleLanguageClick}
                className="flex items-center space-x-1 text-white cursor-pointer hover:text-gray-300 transition-colors duration-200"
              >
                <FaGlobe className="w-5 h-5" />
                <span className="uppercase">{currentLang}</span>
              </div>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleLanguageClose}
                PaperProps={{
                  style: {
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                  },
                }}
              >
                {i18n.locales.map((locale) => (
                  <MenuItem
                    key={locale}
                    onClick={() => handleLanguageSelect(locale)}
                    selected={currentLang === locale}
                    sx={{
                      '&:hover': {
                        backgroundColor: '#333',
                      },
                      '&.Mui-selected': {
                        backgroundColor: '#404040',
                      },
                    }}
                  >
                    {locale === 'en' ? dict.navigation.language.en : dict.navigation.language.zh}
                  </MenuItem>
                ))}
              </Menu>

              {/* Regular Nav Items */}
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
            {/* Language Selector for Mobile */}
            <div
              onClick={handleLanguageClick}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-white hover:bg-gray-700 transition-colors duration-200"
            >
              <FaGlobe className="w-5 h-5" />
              <span>{dict.navigation.language.select} ({currentLang.toUpperCase()})</span>
            </div>
            {/* Regular Nav Items */}
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



