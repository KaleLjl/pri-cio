import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import Providers from "@/components/Providers";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRI-CIO",
  description: "A application using to tell the price of the object",
  keywords: ["Price", "AI", "Fee"],
  authors: [{ name: "Lele" }],
  robots: "index, follow",
  verification: {
    google: "YsLcwUzgOpc9pNg_Bn01y5qWF5KVw2Uup4FHQXA2Enc"
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
          <Navigation />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
