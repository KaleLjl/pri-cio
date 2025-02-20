'use client';
import { useEffect, useRef, useState } from 'react';
import { FaUsers, FaMapMarkerAlt, FaImages, FaClock } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function LandingContent() {
  const router = useRouter();
  const descriptionSectionRef = useRef<HTMLDivElement>(null);
  const [isExiting, setIsExiting] = useState(false);

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
    setIsExiting(true);
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
      `}</style>

      <div className="relative min-h-screen">
        <video className="absolute top-0 left-0 w-full h-full object-cover" autoPlay loop muted>
          <source src="/video/bg1.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className={`relative z-10 min-h-screen flex flex-col justify-center items-center text-center text-white bg-black bg-opacity-50`}>
          <h1 className={isExiting ? 'text-6xl font-bold mb-4 animate-fadeOut' : 'text-6xl font-bold mb-4 animate-fadeIn animate-delay-0'}>
            Price it, Sell Smart
          </h1>
          <p className={isExiting ? 'text-xl font-light mb-8 max-w-lg animate-fadeOut' : 'text-xl font-light mb-8 max-w-lg animate-fadeIn animate-delay-500'}>
            Leverage the power of AI to price your products and connect with local buyers effortlessly.
          </p>
          <div className={isExiting ? 'flex gap-4 animate-fadeOut' : 'flex gap-4 animate-fadeIn animate-delay-1000'}>
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
          <h2 className="text-4xl font-bold mb-6">How We Simplify Buying and Selling</h2>
          <p className="text-gray-300 text-lg">
            Our company leverages advanced AI technology to simplify buying and selling. We generate accurate pricing
            for sellers based on the pictures they provide and automatically post their items to location-specific groups.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full max-w-6xl">
          <div>
            <ul className="space-y-6">
              <li className="flex items-start animate-on-scroll">
                <FaUsers className="text-purple-500 w-6 h-6 mr-4" />
                <div>
                  <h3 className="text-lg font-semibold">Tailored Groups for Local Connections</h3>
                  <p className="text-gray-300">
                    Automatically post items to location-specific groups for face-to-face transactions.
                  </p>
                </div>
              </li>
              <li className="flex items-start animate-on-scroll">
                <FaMapMarkerAlt className="text-purple-500 w-6 h-6 mr-4" />
                <div>
                  <h3 className="text-lg font-semibold">Location-Specific Selling</h3>
                  <p className="text-gray-300">
                    Easily connect with buyers nearby and sell items anytime, anywhere.
                  </p>
                </div>
              </li>
              <li className="flex items-start animate-on-scroll">
                <FaImages className="text-purple-500 w-6 h-6 mr-4" />
                <div>
                  <h3 className="text-lg font-semibold">AI-Powered Pricing</h3>
                  <p className="text-gray-300">
                    Generate accurate pricing by simply uploading pictures of your products.
                  </p>
                </div>
              </li>
              <li className="flex items-start animate-on-scroll">
                <FaClock className="text-purple-500 w-6 h-6 mr-4" />
                <div>
                  <h3 className="text-lg font-semibold">24/7 Availability</h3>
                  <p className="text-gray-300">
                    Enjoy round-the-clock access to our platform for effortless selling.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="relative animate-on-scroll">
            <div className="aspect-w-16 aspect-h-9">
              <iframe
                className="rounded-lg shadow-lg"
                src="https://www.youtube.com/embed/sample-video"
                title="Explainer Video"
                allow="autoplay; encrypted-media"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}