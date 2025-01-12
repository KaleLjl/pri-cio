'use client';

import LogoImage from '/public/image/logo.png';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-4 bg-black text-gray-500 flex justify-center items-center gap-4">
      <div className="flex items-center gap-2">
        <img src={LogoImage.src} alt="Logo" className="h-6" />
        <p>© {year} All Rights Reserved</p>
      </div>
      <a
        href="mailto:customer@pri-cio.co.uk"
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        Contact Us
      </a>
    </footer>
  );
};

export default Footer;



