import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-50">
      <div className="container h-full max-w-4xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className={`text-lg font-medium transition-colors ${
              isActive('/') ? 'text-purple-500' : 'text-white hover:text-purple-400'
            }`}
          >
            Price
          </Link>
          <Link
            href="/explore"
            className={`text-lg font-medium transition-colors ${
              isActive('/explore') ? 'text-purple-500' : 'text-white hover:text-purple-400'
            }`}
          >
            Explore
          </Link>
          <Link
            href="/chats"
            className={`text-lg font-medium transition-colors ${
              isActive('/chats') || isActive('/chat/') ? 'text-purple-500' : 'text-white hover:text-purple-400'
            }`}
          >
            Messages
          </Link>
        </div>
        <Link
          href="/profile"
          className={`text-lg font-medium transition-colors ${
            isActive('/profile') ? 'text-purple-500' : 'text-white hover:text-purple-400'
          }`}
        >
          Profile
        </Link>
      </div>
    </nav>
  );
} 