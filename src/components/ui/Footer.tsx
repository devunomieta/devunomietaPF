"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { NewsletterForm } from "./NewsletterForm";
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile & Tablet Layout (< 1024px): Strictly Quote -> Time -> Links */}
        <div className="flex lg:hidden flex-col items-center text-muted text-xs sm:text-sm gap-4 text-center">
          {/* 1. Quote */}
          <p className="italic text-sm sm:text-base font-medium text-foreground py-1 w-full">
            <span className="text-accent-blue opacity-50">&quot;</span>
            Time is of essence
            <span className="text-accent-blue opacity-50">&quot;</span>
          </p>

          {/* 2. Date and Time */}
          <div className="flex items-center justify-center gap-2 min-h-[24px]">
            <Clock size={15} className={mounted ? "text-accent-blue shrink-0" : "text-muted opacity-20 shrink-0"} />
            <span className="font-mono text-foreground font-medium whitespace-nowrap">
              {mounted && time ? (
                <>
                  {time.toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  <span className="mx-1.5 text-border">|</span>
                  {time.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </>
              ) : (
                <span className="text-muted opacity-20">Loading clock...</span>
              )}
            </span>
          </div>

          {/* 3. Links */}
          <div className="flex items-center justify-center gap-x-4 gap-y-1.5 flex-wrap">
            <Link href="/academic" className="hover:text-foreground transition-colors hover:underline">Academic</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors hover:underline">Contact</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors hover:underline" rel="privacy-policy">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors hover:underline">Terms of Service</Link>
          </div>
        </div>

        {/* Desktop Layout (>= 1024px): 3 columns (Links, Quote, Clock) */}
        <div className="hidden lg:grid lg:grid-cols-3 items-center text-muted text-sm">
          <div className="flex items-center justify-start gap-x-4 gap-y-2 flex-wrap">
            <Link href="/academic" className="hover:text-foreground transition-colors hover:underline">Academic</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors hover:underline">Contact</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors hover:underline" rel="privacy-policy">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors hover:underline">Terms of Service</Link>
          </div>

          <p className="italic text-base lg:text-lg font-medium text-foreground text-center">
            <span className="text-accent-blue opacity-50">&quot;</span>
            Time is of essence
            <span className="text-accent-blue opacity-50">&quot;</span>
          </p>

          <div className="flex items-center justify-end gap-2 min-h-[24px]">
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
      </div>
    </footer>
  );
}
