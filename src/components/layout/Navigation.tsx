'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import LogoImage from '/public/image/logo.png';
import {
  FaSearch,
  FaGlobe,
  FaAlignJustify,
  FaCompass,
  FaEnvelopeOpenText,
  FaPenFancy,
  FaDesktop,
  FaSignInAlt,
  FaSignOutAlt,
} from 'react-icons/fa';
import { Menu, MenuItem } from '@mui/material';
import { i18n } from '@/lib/i18n/i18n-config';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import { useLanguage } from '@/lib/context/LanguageContext';

interface NavItem {
  label: JSX.Element;
  href: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

const Navigation: React.FC = () => {
  const { dict } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Current language from URL
  const currentLang = pathname?.split('/')[1] || 'en';

  // For user avatar and name
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // For toggling the mobile menu (hamburger)
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // For the top search bar on /explore
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Menu anchor for the language sub-menu
  const [anchorElLanguage, setAnchorElLanguage] = useState<null | HTMLElement>(null);
  const handleLanguageClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElLanguage(event.currentTarget);
  };
  const handleLanguageClose = () => {
    setAnchorElLanguage(null);
  };
  const handleLanguageSelect = (lang: string) => {
    const newPath = pathname.replace(`/${currentLang}`, `/${lang}`);
    router.push(newPath);
    handleLanguageClose();
  };

  // Fetch user avatar if logged in
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch(`/api/editprofile`);
          if (!response.ok) {
            throw new Error(`Failed to fetch user profile: ${response.statusText}`);
          }
          const profiles = await response.json();
          const userProfile = profiles.find(
            (profile: { email: string }) => profile.email === session.user?.email
          );
          
          // Set avatar URL
          if (userProfile?.avatarUrl) {
            setCurrentAvatarUrl(userProfile.avatarUrl);
          } else {
            setCurrentAvatarUrl(null);
          }
          
          // Set user name in state and update session
          if (userProfile?.name) {
            setUserName(userProfile.name);
            if (session.user) {
              session.user.name = userProfile.name;
            }
          } else {
            setUserName(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setCurrentAvatarUrl(null);
          setUserName(null);
        }
      }
    };
    fetchUserProfile();
  }, [session?.user?.email]);

  const emailInitial = session?.user?.email?.charAt(0).toUpperCase() || 'U';
  // Use userName from state if available, otherwise fall back to session name
  const displayName = userName || session?.user?.name;

  // Main nav items
  const navItems: NavItem[] = session
    ? [
        {
          label: (
            <div className="flex items-center space-x-2">
              <FaCompass />
              <span>{dict.navigation.explore}</span>
            </div>
          ),
          href: `/${currentLang}/explore`,
        },
        {
          label: (
            <div className="flex items-center space-x-2">
              <FaEnvelopeOpenText />
              <span>{dict.navigation.messages}</span>
            </div>
          ),
          href: `/${currentLang}/chathistory`,
        },
        {
          label: (
            <div className="flex items-center space-x-2">
              <FaPenFancy />
              <span>{dict.navigation.createpost}</span>
            </div>
          ),
          href: `/${currentLang}/createpost`,
        },
        {
          label: (
            <div className="flex items-center space-x-2">
              <FaGlobe />
              <span>{currentLang.toUpperCase()}</span>
            </div>
          ),
          href: 'language-selector',
          onClick: handleLanguageClick
        },
        {
          label: (
            <div className="flex items-center space-x-2">
              <FaSignOutAlt />
              <span>{dict.navigation.signout}</span>
            </div>
          ),
          href: 'sign-out',
          onClick: () => signOut()
        },
        {
          label: (
            <div className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600">
              {currentAvatarUrl ? (
                <ImageWithFallback
                  src={currentAvatarUrl}
                  alt={displayName || emailInitial}
                  layout="fill"
                  objectFit="cover"
                  isAvatar
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-purple-600 text-white">
                  {displayName ? displayName[0].toUpperCase() : emailInitial}
                </div>
              )}
            </div>
          ),
          href: `/${currentLang}/history`,
        },
      ]
    : [
        {
          label: (
            <div className="flex items-center space-x-2">
              <FaCompass />
              <span>{dict.navigation.explore}</span>
            </div>
          ),
          href: `/${currentLang}/explore`,
        },
        {
          label: (
            <div className="flex items-center space-x-2">
              <FaGlobe />
              <span>{currentLang.toUpperCase()}</span>
            </div>
          ),
          href: 'language-selector',
          onClick: handleLanguageClick
        },
        {
          label: (
            <div className="flex items-center space-x-2">
              <FaSignInAlt />
              <span>{dict.navigation.signin}</span>
            </div>
          ),
          href: `/${currentLang}/signin`,
        },
      ];

  // For clicking nav items in mobile
  const handleNavClick = (item: NavItem, event: React.MouseEvent<HTMLElement>) => {
    if (item.onClick) {
      item.onClick(event);
    } else {
      setIsOpen(false);
      router.push(item.href);
    }
  };

  // Searching on the /explore page
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (pathname === `/${currentLang}/explore`) {
      router.push(`/${currentLang}/explore?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black bg-opacity-50 backdrop-blur-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href={`/${currentLang}`} className="flex items-center space-x-2">
              <Image src={LogoImage} alt="Logo" width={50} height={50} />
              <span className="text-2xl font-bold text-white">PRICIO AI</span>
            </Link>
          </div>

          {/* Search Bar (only on /explore) */}
          {pathname.includes('/explore') && (
            <div className="flex-grow flex justify-center">
              <div className="relative w-full max-w-xs">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={dict.navigation.search || 'Search...'}
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

          {/* Desktop Nav */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {/* Main nav items */}
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (item.onClick) {
                      e.preventDefault();
                      handleNavClick(item, e);
                    }
                  }}
                  className="text-white hover:text-gray-300 transition-colors duration-200"
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
              {/* Hamburger / X icon */}
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
        <div className="md:hidden bg-black bg-opacity-80 backdrop-blur-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <div
                key={item.href}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    handleNavClick(item, e);
                  }
                }}
                className="block px-3 py-2 rounded-md text-white hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
              >
                {item.label}
              </div>
            ))}
            <hr className="my-2 border-gray-700" />
            {session ? (
              <>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick({
                      label: (
                        <div className="flex items-center space-x-2">
                          <FaDesktop />
                          <span>{dict.navigation.app}</span>
                        </div>
                      ),
                      href: `/${currentLang}/app`,
                    }, e);
                  }}
                  className="block px-3 py-2 rounded-md text-white hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                >
                  <FaDesktop className="inline mr-2" />
                  {dict.navigation.app}
                </div>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick({
                      label: (
                        <div className="flex items-center space-x-2">
                          <FaGlobe />
                          <span>{currentLang.toUpperCase()}</span>
                        </div>
                      ),
                      href: 'language-selector',
                      onClick: handleLanguageClick
                    }, e);
                  }}
                  className="flex items-center px-3 py-2 rounded-md text-white hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                >
                  <FaGlobe className="mr-2" />
                  {currentLang.toUpperCase()}
                </div>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick({
                      label: (
                        <div className="flex items-center space-x-2">
                          <FaSignOutAlt />
                          <span>{dict.navigation.signout}</span>
                        </div>
                      ),
                      href: 'sign-out',
                      onClick: () => signOut()
                    }, e);
                  }}
                  className="block px-3 py-2 rounded-md text-white hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                >
                  <FaSignOutAlt className="inline mr-2" />
                  {dict.navigation.signout}
                </div>
              </>
            ) : (
              <>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick({
                      label: (
                        <div className="flex items-center space-x-2">
                          <FaSignInAlt />
                          <span>{dict.navigation.signin}</span>
                        </div>
                      ),
                      href: `/${currentLang}/signin`,
                    }, e);
                  }}
                  className="block px-3 py-2 rounded-md text-white hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                >
                  <FaSignInAlt className="inline mr-2" />
                  {dict.navigation.signin}
                </div>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick({
                      label: (
                        <div className="flex items-center space-x-2">
                          <FaGlobe />
                          <span>{currentLang.toUpperCase()}</span>
                        </div>
                      ),
                      href: 'language-selector',
                      onClick: handleLanguageClick
                    }, e);
                  }}
                  className="flex items-center px-3 py-2 rounded-md text-white hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                >
                  <FaGlobe className="mr-2" />
                  {currentLang.toUpperCase()}
                </div>
              </>
            )}

            {/* Second-level menu for language (mobile) */}
            <Menu
              anchorEl={anchorElLanguage}
              open={Boolean(anchorElLanguage)}
              onClose={handleLanguageClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  borderRadius: 2,
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
                  {locale === 'en'
                    ? dict.navigation.language.en
                    : dict.navigation.language.zh}
                </MenuItem>
              ))}
            </Menu>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;






