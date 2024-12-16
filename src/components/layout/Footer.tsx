'use client';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className= 'w-full py-4 text-center bg-black border-t border-gray-600 text-gray-600' >
      <div className="flex justify-center items-center gap-4">
        <p>Contact: hello@pri-cio.co.uk</p>
        <p className="text-sm">© {year} All Rights Reserved</p>
      </div>
    </footer>
  );
};

export default Footer;


