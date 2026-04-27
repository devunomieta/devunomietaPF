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

export const metadata: Metadata = {
  title: "Joseph Unomieta | Senior Software Engineer & Architect",
  description: "Personal website of Joseph Unomieta (@DevUnomieta). Building web products that work and helping them grow.",
};

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
        <main className="flex-1 flex flex-col max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-8">
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
