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

  if (!mounted || !time) {
    return (
      <footer className="border-t border-border mt-auto py-6 bg-header/30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 items-center text-muted text-sm gap-4">
          <div className="flex items-center justify-center md:justify-start gap-4 opacity-0">
            <span>Academic</span>
            <span>Contact</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
          <p className="italic text-xs font-medium opacity-0 text-center">"Time is of essence"</p>
          <div className="flex items-center justify-center md:justify-end gap-2 opacity-0">
            <Clock size={16} />
            <span className="font-mono">Loading...</span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border mt-auto py-6 bg-header/30">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 items-center text-muted text-sm gap-4">
        {/* Left: Links */}
        <div className="flex items-center justify-center md:justify-start gap-4">
          <Link href="/academic" className="hover:text-foreground transition-colors hover:underline">Academic</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors hover:underline">Contact</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors hover:underline">Terms</Link>
        </div>
        
        {/* Center: Quote */}
        <p className="italic text-xs font-medium text-muted/80 text-center">"Time is of essence"</p>
        
        {/* Right: Date and Time */}
        <div className="flex items-center justify-center md:justify-end gap-2">
          <Clock size={16} className="text-accent-blue" />
          <span className="font-mono text-foreground font-medium">
            {time.toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            <span className="mx-2 text-border">|</span>
            {time.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </footer>
  );
}
