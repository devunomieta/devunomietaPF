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

export async function generateMetadata(): Promise<Metadata> {
  const adminDb = createAdminClient();
  const { data: settingsRows } = await adminDb.from('site_settings').select('key, value');
  
  const settings: Record<string, string> = {};
  for (const row of settingsRows || []) {
    settings[row.key] = row.value ?? '';
  }

  return {
    title: settings['site_name'] ? `${settings['site_name']} | ${settings['site_tagline']}` : "Joseph Unomieta | Senior Software Engineer & Architect",
    description: settings['site_description'] || "Personal website of Joseph Unomieta (@DevUnomieta). Building web products that work and helping them grow.",
    icons: {
      icon: settings['favicon_url'] || '/favicon.ico',
      apple: settings['favicon_url'] || '/favicon.ico',
    },
    openGraph: {
      images: settings['og_image_url'] ? [settings['og_image_url']] : [],
    }
  };
}

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
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-accent-blue selection:text-white">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
