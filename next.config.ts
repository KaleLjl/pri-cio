import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pri-cio.s3.eu-west-2.amazonaws.com',
        pathname: '/images/**',
      },
    ],
  },
};

export default nextConfig;
