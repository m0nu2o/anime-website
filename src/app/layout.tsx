import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AnimeAmbientBackground from "@/components/AnimeAmbientBackground";
import ThemeSimulatorProvider from "@/components/ThemeSimulatorProvider";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { AuthProvider } from "@/lib/supabase/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NextGen Anime | Next-Generation Anime Platform",
  description: "A premium, next-generation anime discovery, watching, and 3D simulation platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;700;800&family=Space+Grotesk:wght@500;700&family=Syne:wght@600;700;800;900&display=swap" 
          rel="stylesheet" 
        />
        {/* Preconnect to streaming servers for faster video loading */}
        <link rel="preconnect" href="https://www.googleapis.com" />
        <link rel="dns-prefetch" href="https://reanimehd.org" />
        <link rel="dns-prefetch" href="https://reanime.net" />
      </head>
      <body>
        <AuthProvider>
          <ThemeSimulatorProvider>
            <AnimeAmbientBackground />
            <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                {children}
              </div>
              <Footer />
            </div>
            <AuthModal />
          </ThemeSimulatorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
