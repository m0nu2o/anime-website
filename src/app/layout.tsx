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
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NextGen Anime | Next-Generation Anime Platform",
  description: "A premium, cinematic anime discovery, watching, and interactive 3D simulation platform.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "NextGen Anime | Next-Generation Anime Platform",
    description: "A premium, cinematic anime discovery, watching, and interactive 3D simulation platform.",
    siteName: "NextGen Anime",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://flixcloud.cc" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fetch9.flixcloud.cc" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://vault-90.rundowncdn.top" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://vault-93.rundowncdn.top" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://flixcloud.cc" />
        <link rel="dns-prefetch" href="https://fetch9.flixcloud.cc" />
      </head>
      <body>
        <AuthProvider>
          <ThemeSimulatorProvider>
            <AnimeAmbientBackground />
            <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, paddingTop: 'var(--navbar-height)' }}>
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
