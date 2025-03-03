'use client';
import { useEffect, useRef, useState } from 'react';
import { FaUsers, FaMapMarkerAlt, FaImages, FaClock } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface FAQItem {
  question: string;
  answer: string;
}

export default function LandingContent() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "What is Pricio AI?",
      answer: "Pricio AI is an innovative AI-powered platform that combines advanced valuation technology with community-driven insights. We help users accurately assess the value of products and services while fostering meaningful connections within local communities."
    },
    {
      question: "How does Pricio AI's valuation system work?",
      answer: "Our platform uses sophisticated AI technology to analyze photos of items and provide instant, accurate valuations. The system continuously learns and improves through user interactions, creating increasingly precise estimates over time."
    },
    {
      question: "What makes Pricio AI unique?",
      answer: "Pricio AI stands out through our self-learning AI system that combines machine intelligence with community insights. As more users interact with our platform, our valuation models become increasingly accurate, creating a dynamic ecosystem that benefits all users."
    },
    {
      question: "How does the community aspect work?",
      answer: "Our platform enables real-time community input and support, allowing users to connect with others in their area. This creates a trusted network for trading and sharing insights, making transactions more transparent and meaningful."
    },
    {
      question: "Is Pricio AI free to use?",
      answer: "Pricio AI offers both free and premium features. Basic functionalities including AI-powered valuations and community access are available at no cost, while advanced features may require a subscription."
    },
    {
      question: "How accurate are the AI valuations?",
      answer: "Our AI valuation system leverages advanced machine learning algorithms and real community data to provide highly accurate estimates. The system continuously improves through user feedback and transactions, ensuring increasingly precise valuations over time."
    },
    {
      question: "What types of items can I get valuations for?",
      answer: "Pricio AI can provide valuations for a wide range of items including electronics, furniture, collectibles, vehicles, and more. Our AI system is trained on diverse datasets to ensure accurate pricing across multiple categories."
    },
    {
      question: "How does Pricio AI ensure transaction safety?",
      answer: "We prioritize user safety through verified user profiles, secure messaging, and location-based matching. Our platform also provides transaction guidelines and best practices for safe face-to-face meetings."
    },
    {
      question: "Can I use Pricio AI for professional business purposes?",
      answer: "Yes, Pricio AI offers specialized features for business users, including bulk valuation capabilities, detailed analytics, and enhanced listing options. Contact our support team to learn more about our business solutions."
    },
    {
      question: "What happens if the AI valuation differs from market prices?",
      answer: "While our AI provides highly accurate estimates, users can always adjust prices based on their knowledge or market conditions. The community feedback system helps refine valuations and ensures market alignment."
    },
    {
      question: "How does Pricio AI protect user privacy?",
      answer: "We implement strict data protection measures and follow industry-standard security protocols. Personal information is encrypted, and users have control over what information they share with the community."
    },
    {
      question: "Can I get support if I have questions or issues?",
      answer: "Yes, Pricio AI provides comprehensive customer support through multiple channels. Our help center offers detailed guides, and our support team is available to assist with any questions or concerns."
    }
  ];

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

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
        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @keyframes expand {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
        }
        @keyframes dash {
          to {
            stroke-dashoffset: 1000;
          }
        }
        @keyframes drawLine {
          from {
            stroke-dasharray: 200;
            stroke-dashoffset: 200;
          }
          to {
            stroke-dasharray: 200;
            stroke-dashoffset: 0;
          }
        }
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translate(-20px, 0);
          }
          to {
            opacity: 1;
            transform: translate(0, 0);
          }
        }
        .animate-fadeIn {
          opacity: 0;
          animation: fadeIn 1s ease-out forwards;
        }
        pre {
          white-space: pre;
          overflow-x: auto;
          margin: 0;
          padding: 0;
          font-size: inherit;
          line-height: 1;
        }
        .animate-on-scroll {
          opacity: 1;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .animate-on-scroll.animate-fadeIn {
          opacity: 1;
          transform: translateY(0);
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

      <div ref={descriptionSectionRef} className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-8 pt-48 pb-32">
        <div className="max-w-4xl text-center mb-40 animate-on-scroll">
          <h2 className="text-4xl font-bold mb-8">How We Simplify Buying and Selling</h2>
          <p className="text-gray-300 text-lg">
            Our company leverages advanced AI technology to simplify buying and selling. We generate accurate pricing
            for sellers based on the pictures they provide and automatically post their items to location-specific groups.
          </p>
        </div>

        {/* Local Connections Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full max-w-6xl mb-56">
          <div className="animate-on-scroll">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Tailored Groups for Local Connections</h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Automatically post items to location-specific groups for face-to-face transactions. Our smart matching system
                connects you with buyers and sellers in your area, making local commerce easier than ever.
              </p>
            </div>
          </div>
          <div className="relative animate-on-scroll w-[115vw] -mr-[10vw] overflow-hidden">
            <div className="aspect-w-16 aspect-h-9">
              <img
                src="/image/landing_content_new.png"
                alt="Local Connections Feature"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Location-Specific Selling Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full max-w-6xl mb-56">
          <div className="relative animate-on-scroll w-full overflow-hidden lg:order-1">
            <div className="relative w-full h-[400px] overflow-hidden">
              <img
                src="/image/location_specific_new.png"
                alt="Location-Specific Feature"
                className="w-full h-full object-cover rounded-lg shadow-2xl"
                style={{
                  filter: 'blur(0px)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
            </div>
          </div>
          <div className="animate-on-scroll lg:order-2">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Location-Specific Selling</h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Easily connect with buyers nearby and sell items anytime, anywhere. Our location-based matching system
                ensures you reach the right audience in your area, maximizing your selling potential.
              </p>
            </div>
          </div>
        </div>

        {/* AI-Powered Pricing Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full max-w-6xl mb-56">
          <div className="animate-on-scroll">
            <div>
              <h3 className="text-2xl font-semibold mb-4">AI-Powered Pricing</h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Generate accurate pricing by simply uploading pictures of your products. Our advanced AI technology
                analyzes your items and provides market-based pricing recommendations instantly.
              </p>
            </div>
          </div>
          <div className="relative animate-on-scroll w-full max-w-lg overflow-hidden rounded-lg shadow-2xl bg-black p-8">
            <img
              src="/image/landing_content_text.png"
              alt="AI-Powered Pricing"
              className="w-full h-auto object-contain mb-6"
            />
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden relative mb-4">
              <div className="w-1/3 h-full bg-purple-500 rounded-full absolute left-0 top-0 animate-[loading_2s_ease-in-out_infinite] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-purple-400 before:to-transparent before:animate-[shimmer_1s_linear_infinite]">
              </div>
            </div>
            <p className="text-purple-500 text-lg tracking-wider animate-pulse text-center">
              Analyzing Image....
            </p>
          </div>
        </div>

        {/* 24/7 Availability Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full max-w-6xl mb-40">
          <div className="relative animate-on-scroll w-[115vw] -ml-[75vw] overflow-hidden lg:order-1">
            <div className="relative w-full h-[400px] overflow-hidden">
              <img
                src="/image/landing_content_new.png"
                alt="24/7 Availability Feature"
                className="w-full h-full object-cover rounded-lg shadow-2xl"
                style={{
                  filter: 'blur(0px)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
            </div>
          </div>
          <div className="animate-on-scroll lg:order-2">
            <div>
              <h3 className="text-2xl font-semibold mb-4">24/7 Availability</h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Enjoy round-the-clock access to our platform for effortless selling. List your items any time,
                receive instant valuations, and connect with potential buyers whenever it's convenient for you.
                Our AI-powered system works tirelessly to ensure your items get maximum visibility.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Network Animation Section */}
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-8 py-32 relative">
        <svg className="w-full max-w-4xl" viewBox="0 0 800 400">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <g className="network-animation">
            {/* First bubble */}
            <circle 
              cx="200" 
              cy="200" 
              r="40" 
              className="fill-purple-500" 
              style={{
                filter: 'url(#glow)',
                animation: 'pulse 2s ease-in-out infinite'
              }} 
            />

            {/* Second bubble with connection */}
            <g>
              <line 
                x1="240" 
                y1="200" 
                x2="360" 
                y2="200" 
                className="stroke-purple-400" 
                strokeWidth="2"
                style={{
                  animation: 'flowLine 4s linear infinite, drawLine 2s ease-out forwards',
                  strokeDasharray: '12,8',
                  strokeLinecap: 'round'
                }}
              />
              <circle 
                cx="400" 
                cy="200" 
                r="40" 
                className="fill-purple-400"
                style={{
                  filter: 'url(#glow)',
                  animation: 'pulse 2s ease-in-out infinite 0.5s'
                }}
              />
            </g>

            {/* Third bubble with connection */}
            <g>
              <line 
                x1="440" 
                y1="200" 
                x2="560" 
                y2="200" 
                className="stroke-purple-400" 
                strokeWidth="2"
                style={{
                  animation: 'flowLine 4s linear infinite, drawLine 2s ease-out forwards 1s',
                  strokeDasharray: '12,8',
                  strokeLinecap: 'round'
                }}
              />
              <circle 
                cx="600" 
                cy="200" 
                r="40" 
                className="fill-purple-400"
                style={{
                  filter: 'url(#glow)',
                  animation: 'pulse 2s ease-in-out infinite 1s'
                }}
              />
            </g>
          </g>
        </svg>
        

        
        <div className="text-center mt-12 max-w-2xl">
          <h2 className="text-4xl font-bold mb-6">Connected Community</h2>
          <p className="text-gray-300 text-lg">
            Join our growing network of users and become part of a community that values
            fair pricing and meaningful connections.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-8 py-32 relative z-20">
        <div className="max-w-4xl w-full bg-black bg-opacity-80 p-8 rounded-lg">
          <h2 className="text-4xl font-bold mb-8 text-center animate-on-scroll">Pricio AI FAQs</h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="animate-on-scroll"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <button
                  className="w-full text-left p-4 bg-gray-900 hover:bg-gray-800 rounded-lg flex justify-between items-center transition-all duration-200"
                  onClick={() => toggleFAQ(index)}
                >
                  <span className="text-lg font-medium">{faq.question}</span>
                  <svg
                    className={`w-6 h-6 transform transition-transform duration-200 ${expandedFAQ === index ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                
                <div
                  className={`overflow-hidden transition-all duration-200 ${expandedFAQ === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-4 bg-gray-800 rounded-b-lg">
                    <p className="text-gray-300">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="my-80 text-center">
          <h2 className="text-6xl font-light mb-4">Pricio. Pricio? Pricio!</h2>
          <button
            className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition"
            onClick={() => handleNavigation('/app')}
          >
            Let's Go!
          </button>
        </div>
      </div>
    </>
  );
}