"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import Link from "next/link";

export function Footer() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="border-t border-border mt-auto py-6 bg-header/30 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 items-center text-muted text-sm gap-4">
        {/* Left: Links - Always rendered for SEO and Google Verification */}
        <div className="flex items-center justify-center md:justify-start gap-x-4 gap-y-2 flex-wrap">
          <Link href="/academic" className="hover:text-foreground transition-colors hover:underline">Academic</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors hover:underline">Contact</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors hover:underline" rel="privacy-policy">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors hover:underline">Terms of Service</Link>
        </div>
        
        {/* Center: Quote */}
        <p className="italic text-base md:text-lg font-medium text-foreground text-center py-4 md:py-0 border-y md:border-y-0 border-border/50">
          <span className="text-accent-blue opacity-50">&quot;</span>
          Time is of essence
          <span className="text-accent-blue opacity-50">&quot;</span>
        </p>
        
        {/* Right: Date and Time - Dynamic parts check for mounted */}
        <div className="flex items-center justify-center md:justify-end gap-2 min-h-[24px]">
          <Clock size={16} className={mounted ? "text-accent-blue" : "text-muted opacity-20"} />
          <span className="font-mono text-foreground font-medium">
            {mounted && time ? (
              <>
                {time.toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                <span className="mx-2 text-border">|</span>
                {time.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </>
            ) : (
              <span className="text-muted opacity-20">Loading clock...</span>
            )}
          </span>
        </div>
      </div>
    </footer>
  );
}
