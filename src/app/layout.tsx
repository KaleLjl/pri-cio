import type { Metadata } from "next";
import Providers from "@/components/Providers";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://pri-cio.co.uk'),
  title: "PRICIO AI",
  description: "A application using to tell the price of the object",
  keywords: ["Price", "AI", "Fee"],
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
    title: 'PRICIO AI',
    description: 'AI powered price estimation tool',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PRICIO AI',
    description: 'AI powered price estimation tool',
    images: ['/twitter-image.jpg'],
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
