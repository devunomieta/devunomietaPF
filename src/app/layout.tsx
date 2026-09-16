import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { TourGuide } from "@/components/ui/TourGuide";

const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

import { createAdminClient } from "@/utils/supabase/admin";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const adminDb = createAdminClient();
  const { data: settingsRows } = await adminDb.from('site_settings').select('key, value');
  
  const settings: Record<string, string> = {};
  for (const row of settingsRows || []) {
    settings[row.key] = row.value ?? '';
  }
 
  return {
    title: settings['site_name'] ? `${settings['site_name']} | ${settings['site_tagline']}` : "Joseph Unomieta | Software Engineer & Product Manager",
    description: settings['site_description'] || "I solve business problems that happen to need software. Six years building and leading products end-to-end, across Sports, Fintech, E-Commerce, and Education.", 
    icons: {
      icon: settings['favicon_url'] || '/favicon.ico',
      apple: settings['favicon_url'] || '/favicon.ico',
    },
    openGraph: {
      images: settings['og_image_url'] 
        ? [settings['og_image_url']] 
        : settings['logo_url'] 
          ? [settings['logo_url']] 
          : settings['favicon_url'] 
            ? [settings['favicon_url']] 
            : [],
    }
  };
}

import { AnnouncementBar } from "@/components/ui/AnnouncementBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <head>
        <link rel="icon" href="/api/favicon" sizes="any" />
        <link rel="apple-touch-icon" href="/api/favicon" />
      </head>
      <body 
        className="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent-blue selection:text-white"
        suppressHydrationWarning
      >
        <AnnouncementBar />
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
          {children}
        </main>
        <Footer />
        
        {/* Overlays */}
        <CommandPalette />
        <TourGuide />
      </body>
    </html>
  );
}
