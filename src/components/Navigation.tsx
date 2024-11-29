'use client'
import Link from 'next/link';
import Image from 'next/image';
import LogoImage from '../public/image/logo.png';
import LogoName from '../public/image/logo_name.png';


interface NavigationProps {
  logo?: string;
}

const Navigation: React.FC<NavigationProps> = ({ 
}) => {
  return (
    <nav className="bg-background border-b border-foreground/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <Image src={LogoImage} alt="Logo" width={50} height={50} />
              <Image 
                src={LogoName} 
                alt="Logo Name" 
                className="w-[100px] h-[20px]" 
              />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;