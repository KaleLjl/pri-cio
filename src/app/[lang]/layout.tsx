import type { Metadata } from "next";
import Providers from "@/lib/Providers";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import "./globals.css";
import { i18n, type Locale } from '@/lib/i18n/i18n-config';
import { getDictionary } from '@/lib/i18n/get-dictionary';

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

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
      { url: '/image/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/image/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/image/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/image/favicon.ico' },
    ],
    apple: [
      {
        url: '/image/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png'
      }
    ],
    shortcut: '/image/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://pri-cio.co.uk',
    siteName: 'PRICIO AI',
    title: 'PRICIO AI - AI Powered Price Estimation',
    description: 'Upload photos and get instant AI-powered price estimates for faces, objects, and food. Fast, fun, and accurate pricing tool.',
    images: [
      {
        url: '/image/logo.png',
        width: 1200,
        height: 630,
        alt: 'PRICIO AI Logo',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
  manifest: '/image/site.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { lang: Locale };
}>) {
  const dict = await getDictionary(params.lang);

  return (
    <html lang={params.lang}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
        />
        <script src="https://unpkg.com/@lottiefiles/lottie-player@2.0.8/dist/lottie-player.js"></script>
      </head>
      <body>
        <Providers>
          <LayoutWrapper dict={dict}>
            {children}
          </LayoutWrapper>
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
