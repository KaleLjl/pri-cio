'use client';
import { useEffect, useRef} from 'react';
import { FaUsers, FaUtensils, FaChair} from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function LandingContent() {
  const router = useRouter();
  const descriptionSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeIn');
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    const elements = descriptionSectionRef.current?.querySelectorAll('.animate-on-scroll');
    elements?.forEach((element) => observer.observe(element));

    return () => {
      elements?.forEach((element) => observer.unobserve(element));
    };
  }, []);

  const handleNavigation = (path: string) => {
    setTimeout(() => {
      router.push(path);
    }, 1000);
  };

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(-20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        @keyframes fadeOut {
          from { 
            opacity: 1; 
            transform: translateY(0); 
          }
          to { 
            opacity: 0; 
            transform: translateY(20px); 
          }
        }
        @keyframes fadeInContent {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        .animate-fadeIn {
          opacity: 0;
          animation: fadeIn 1s ease-out forwards;
        }
        .animate-fadeOut {
          animation: fadeOut 1s ease-out forwards;
        }
        .animate-on-scroll {
          opacity: 0;
        }
        .animate-on-scroll.animate-fadeIn {
          animation: fadeInContent 1.5s ease-out forwards;
        }
        video::-webkit-media-controls {
          display: none !important;
        }
        video::-webkit-media-controls-panel {
          display: none !important;
        }
        video::-webkit-media-controls-play-button {
          display: none !important;
        }
        video::-webkit-media-controls-timeline {
          display: none !important;
        }
        video::-webkit-media-controls-current-time-display {
          display: none !important;
        }
        video::-webkit-media-controls-time-remaining-display {
          display: none !important;
        }
        video::-webkit-media-controls-mute-button {
          display: none !important;
        }
        video::-webkit-media-controls-volume-slider {
          display: none !important;
        }
        video::-webkit-media-controls-fullscreen-button {
          display: none !important;
        }
      `}</style>

      <div className="relative min-h-screen">
        <video 
          className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none" 
          autoPlay 
          loop 
          muted 
          playsInline
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
        >
          <source src="/video/bg1.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className={`relative z-10 min-h-screen flex flex-col justify-center items-center text-center text-white bg-black bg-opacity-50`}>
          <h1 className='text-6xl font-bold mb-4'>Price it</h1>
          <p className='text-xl font-light mb-8 max-w-lg'>
            Curious what your face, food, or gadgets are worth? Snap a pic and I&apos;ll give you a fun and fast price estimate!
          </p>
          <div className='flex gap-4'>
            <button
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition"
              onClick={() => handleNavigation('/app')}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      <div ref={descriptionSectionRef} className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-8">
        <div className="max-w-4xl text-center mb-12 animate-on-scroll">
          <h2 className="text-4xl font-bold mb-6">Turn Images Into Value</h2>
          <p className="text-gray-300 text-lg">
            Discover the value of anything! Upload photos of faces, objects, or food and let our AI deliver prices that
            are both entertaining and precise.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center w-full max-w-6xl">
          <div className="flex flex-col items-center animate-on-scroll">
            <FaUsers className="text-purple-500 w-10 h-10 mb-4" />
            <h3 className="text-lg font-semibold">Fun Face Pricing</h3>
            <p className="text-gray-300">
              Upload your face (or a friend&apos;s) and let our AI rate it with entertaining prices based on personality,
              looks, and star potential.
            </p>
          </div>
          <div className="flex flex-col items-center animate-on-scroll">
            <FaChair className="text-purple-500 w-10 h-10 mb-4" />
            <h3 className="text-lg font-semibold">Object Estimates</h3>
            <p className="text-gray-300">
              Want to know the price of your electronics, gadgets, or art? Upload an image and let our AI calculate the
              estimated value instantly.
            </p>
          </div>
          <div className="flex flex-col items-center animate-on-scroll">
            <FaUtensils className="text-purple-500 w-10 h-10 mb-4" />
            <h3 className="text-lg font-semibold">Food Pricing</h3>
            <p className="text-gray-300">
              Curious about how much your meal costs? Snap a picture of your food and get an accurate AI-generated
              price estimate.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}