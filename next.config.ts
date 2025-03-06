import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    AWS_REGION: 'eu-west-2',
  },
  images: {
    domains: ['sourdoughjesha.com', 'lh3.googleusercontent.com'],
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
