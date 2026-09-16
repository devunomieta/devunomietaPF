"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnnouncementBarClientProps {
  text: string;
  link?: string;
}

export function AnnouncementBarClient({ text, link }: AnnouncementBarClientProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed this specific announcement
    const dismissedAnnouncement = localStorage.getItem("dismissed_announcement_text");
    if (dismissedAnnouncement !== text) {
      setIsVisible(true);
    }
  }, [text]);

  const handleDismiss = () => {
    localStorage.setItem("dismissed_announcement_text", text);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden relative w-full bg-white text-slate-900 font-medium select-none shadow-sm border-b border-slate-200 z-50"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-between relative gap-4">
            <div className="flex items-center gap-3 w-full flex-1 md:justify-center min-w-0">
              <div className="hidden sm:flex shrink-0 items-center justify-center h-5 px-2 rounded bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-[10px] font-bold tracking-widest uppercase">
                UPDATE
              </div>

              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden whitespace-nowrap relative">
                <Megaphone size={15} className="shrink-0 text-accent-blue z-10" />
                <div className="flex-1 overflow-hidden relative mask-fade-edges">
                  <div className="flex animate-ticker whitespace-nowrap hover:[animation-play-state:paused] cursor-default">
                    <span className="text-xs sm:text-sm font-medium tracking-wide text-slate-800 pr-12 inline-block">{text}</span>
                    <span className="text-xs sm:text-sm font-medium tracking-wide text-slate-800 pr-12 inline-block">{text}</span>
                    <span className="text-xs sm:text-sm font-medium tracking-wide text-slate-800 pr-12 inline-block">{text}</span>
                  </div>
                </div>
                <style>{`
                  @keyframes tickerScroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.33%); }
                  }
                  .animate-ticker {
                    animation: tickerScroll 30s linear infinite;
                  }
                  .mask-fade-edges {
                    mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
                  }
                `}</style>
              </div>

              {link && (
                <Link
                  href={link}
                  className="shrink-0 text-xs bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold px-3 py-1 rounded-md shadow-sm transition-all flex items-center gap-1 group"
                >
                  <span>OPEN</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0 focus:outline-none"
              aria-label="Dismiss notice"
            >
              <X size={16} className="text-slate-500 hover:text-slate-800" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
