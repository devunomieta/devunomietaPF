"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Search, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderClientProps {
  logoUrl: string;
  faviconUrl: string;
  siteName: string;
}

export function HeaderClient({ logoUrl, faviconUrl, siteName }: HeaderClientProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "Overview", path: "/" },
    { name: "Experience", path: "/experience" },
    { name: "Projects", path: "/projects" },
    { name: "Blog", path: "/blog" },
    { name: "Academic", path: "/academic" },
    { name: "Contact", path: "/contact" },
  ];

  const activeLogo = logoUrl || faviconUrl;

  return (
    <>
      <header className="bg-header border-b border-border text-foreground sticky top-0 z-30 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden text-muted hover:text-foreground p-1"
            >
              <Menu size={20} />
            </button>
            
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {activeLogo ? (
                <div className="w-10 h-10 relative overflow-hidden rounded-md">
                  <Image src={activeLogo} alt={siteName} fill sizes="40px" className="object-contain" />
                </div>
              ) : (
                <div className="p-2 bg-header border border-border rounded-md">
                  <svg height="28" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="28" className="fill-current">
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                  </svg>
                </div>
              )}
            </Link>
  
            <nav className="hidden md:flex items-center gap-1 ml-2">
              {navLinks.slice(0, 4).map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md transition-colors flex items-center",
                      isActive
                        ? "font-semibold text-foreground bg-accent-blue/10"
                        : "font-medium text-muted hover:bg-border/50 hover:text-foreground"
                    )}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>
  
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-xs text-muted border border-border rounded-md bg-background hover:border-muted transition-colors w-10 sm:w-64"
            >
              <Search size={14} className="shrink-0" />
              <span className="flex-1 text-left hidden sm:inline-block">Search or jump to...</span>
              <kbd className="hidden sm:inline-block ml-2 border border-border rounded px-1.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
  
            <Link
              href="/contact?purpose=hiring"
              className="text-xs font-bold bg-accent-green hover:bg-accent-green/90 text-white px-2.5 sm:px-4 py-2 rounded-md border border-white/10 transition-all flex items-center gap-2 glow"
            >
              <Zap size={14} className="fill-current shrink-0" />
              <span className="hidden xs:inline">Hire Me</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-3/4 max-w-sm bg-header border-r border-border p-6 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold text-lg text-foreground">Menu</span>
              <button onClick={() => setIsMenuOpen(false)} className="text-muted p-2">
                <X size={24} />
              </button>
            </div>
            
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-xl text-base transition-all flex items-center justify-between",
                      isActive
                        ? "bg-accent-blue/10 text-accent-blue font-bold"
                        : "text-foreground hover:bg-white/5"
                    )}
                  >
                    {link.name}
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-10">
              <Link
                href="/contact?purpose=hiring"
                onClick={() => setIsMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-accent-green text-white rounded-xl font-bold shadow-lg"
              >
                <Zap size={18} className="fill-current" />
                Hire Me Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
