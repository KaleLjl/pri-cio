import type { Metadata } from "next";
import Providers from "@/components/Providers";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://pri-cio.co.uk'),
  title: "PRICIO AI - AI Powered Price Estimation",
  description: "Upload photos and get instant AI-powered price estimates for faces, objects, and food. Fast, fun, and accurate pricing tool.",
  keywords: ["Price Estimation", "AI", "Image Recognition", "Value Assessment", "Price Calculator"],
  authors: [{ name: "Lele" }],
  robots: "index, follow",
  verification: {
    google: "YsLcwUzgOpc9pNg_Bn01y5qWF5KVw2Uup4FHQXA2Enc"
  },
  icons: {
    icon: [
      { url: '/image/favicon.ico' },
      { url: '/image/favicon.svg' },
    ],
    apple: '/image/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://pri-cio.co.uk',
    siteName: 'PRICIO AI',
    title: 'PRICIO AI - Instant Price Estimation Tool',
    description: 'Upload photos and get instant AI-powered price estimates for faces, objects, and food. Fast, fun, and accurate pricing tool.',
    images: [
      {
        url: '/og-image.png', // 确保在 public 目录下有这个图片
        width: 1200,
        height: 630,
        alt: 'PRICIO AI Preview',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PRICIO AI - Instant Price Estimation Tool',
    description: 'Upload photos and get instant AI-powered price estimates for faces, objects, and food.',
    images: ['/og-image.png'],
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
