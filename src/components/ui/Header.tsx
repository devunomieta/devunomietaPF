"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Overview", path: "/" },
    { name: "Experience", path: "/experience" },
    { name: "Projects", path: "/projects" },
    { name: "Blog", path: "/blog" },
  ];

  return (
    <header className="bg-header border-b border-border text-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-muted hover:text-foreground">
          <Menu size={20} />
        </button>
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32" data-view-component="true" className="fill-current">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
          </svg>
          <span className="font-semibold hidden sm:inline-block">DevUnomieta</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navLinks.map((link) => {
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
        {/* Search trigger placed properly in the header */}
        <button
          onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted border border-border rounded-md bg-background hover:border-muted transition-colors w-40 sm:w-64"
        >
          <Search size={14} />
          <span className="flex-1 text-left hidden sm:inline-block">Search or jump to...</span>
          <kbd className="hidden sm:inline-block ml-2 border border-border rounded px-1.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>

        <a 
          href="mailto:hello@devunomieta.xyz" 
          className="text-xs font-semibold bg-accent-green hover:bg-accent-green/90 text-white px-3 py-1.5 rounded-md border border-white/10 transition-colors whitespace-nowrap"
        >
          Hire Me
        </a>
      </div>
    </header>
  );
}
