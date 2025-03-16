'use client';
import { useEffect, useRef, useState } from 'react';
import { FaUsers, FaMapMarkerAlt, FaImages, FaClock } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface FAQItem {
  question: string;
  answer: string;
}

export default function LandingContent() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
      }
    );

    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => {
      if (contentRef.current) {
        observer.unobserve(contentRef.current);
      }
    };
  }, []);

  const features = [
    {
      icon: <FaImages className="w-8 h-8 text-purple-500" />,
      title: "AI-Powered Price Estimation",
      description: "Upload photos and get instant price estimates powered by advanced AI technology.",
    },
    {
      icon: <FaMapMarkerAlt className="w-8 h-8 text-purple-500" />,
      title: "Location-Based Search",
      description: "Find items near you with our intelligent location-based search system.",
    },
    {
      icon: <FaUsers className="w-8 h-8 text-purple-500" />,
      title: "Community Marketplace",
      description: "Connect with buyers and sellers in your local community.",
    },
    {
      icon: <FaClock className="w-8 h-8 text-purple-500" />,
      title: "Real-Time Updates",
      description: "Get instant notifications and real-time updates on your items of interest.",
    },
  ];

  const faqs: FAQItem[] = [
    {
      question: "How does the AI price estimation work?",
      answer: "Our AI analyzes your photos using advanced computer vision and machine learning algorithms to provide accurate price estimates based on similar items in our database.",
    },
    {
      question: "Is the service free to use?",
      answer: "Yes, our basic services including AI price estimation and item listing are completely free to use.",
    },
    {
      question: "How accurate are the price estimates?",
      answer: "Our AI provides estimates based on market data and similar items. While highly accurate, we recommend using it as a guide alongside your own research.",
    },
    {
      question: "Can I use the service internationally?",
      answer: "Yes, our service is available worldwide with support for multiple currencies and languages.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 to-black"></div>
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            PRICIO AI
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300">
            AI-Powered Price Estimation for Your Items
          </p>
          <button
            onClick={() => router.push('/explore')}
            className="px-8 py-4 bg-purple-600 text-white rounded-full text-lg font-semibold hover:bg-purple-700 transition-colors duration-300"
          >
            Start Exploring
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div
        ref={contentRef}
        className={`py-20 px-4 transition-opacity duration-1000 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Why Choose PRICIO AI?
        </h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-300"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">{faq.question}</h3>
                <p className="text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-8">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-gray-400 mb-8">
          Join our community and start exploring items near you.
        </p>
        <button
          onClick={() => router.push('/signup')}
          className="px-8 py-4 bg-purple-600 text-white rounded-full text-lg font-semibold hover:bg-purple-700 transition-colors duration-300"
        >
          Sign Up Now
        </button>
      </div>
    </div>
  );
}