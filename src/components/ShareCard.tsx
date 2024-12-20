import Image from 'next/image';

interface ShareCardProps {
  imageUrl: string;
  price: string;
  description: string;
  currency: string;
}

export default function ShareCard({ imageUrl, price, description, currency }: ShareCardProps) {
  return (
    <div className="w-[1200px] h-[630px] relative bg-gradient-to-br from-purple-900 via-black to-purple-900 p-8">
      <div className="relative w-full h-full flex items-center justify-between z-10 bg-black/20 rounded-3xl p-8 backdrop-blur-sm border border-white/10">
        {/* Left side - Image */}
        <div className="w-[45%] h-[90%] relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
          <Image
            src={imageUrl}
            alt={description}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>
        
        {/* Right side - Content */}
        <div className="w-[50%] pl-8 text-white space-y-8">
          <div className="flex items-center space-x-4 mb-12">
            <Image
              src="/image/logo.png"
              alt="PRICIO AI"
              width={60}
              height={60}
              className="rounded-xl"
              unoptimized
            />
            <div>
              <h3 className="text-2xl font-bold text-purple-400">
                PRICIO AI
              </h3>
              <p className="text-sm text-gray-400">AI-Powered Price Estimation</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-7xl font-bold text-purple-400">
              {currency}{price}
            </h2>
            <p className="text-xl font-light text-gray-200 mt-4">
              {description}
            </p>
          </div>
          
          <div className="pt-8 mt-auto">
            <p className="text-lg font-semibold text-purple-400">
              pri-cio.co.uk
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}