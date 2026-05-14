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
          className="overflow-hidden relative w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 text-white font-medium select-none shadow-lg border-b border-white/10 z-50"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between relative gap-4">
            <div className="flex items-center gap-3 w-full flex-1 md:justify-center min-w-0">
              <div className="hidden sm:flex shrink-0 items-center justify-center h-6 px-2 rounded bg-white/20 backdrop-blur-sm text-[10px] uppercase font-bold tracking-widest animate-pulse shadow-sm">
                Notice
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Megaphone size={15} className="shrink-0 text-white/90" />
                <p className="text-xs sm:text-sm truncate font-semibold tracking-wide">
                  {text}
                </p>
              </div>
              {link && (
                <Link
                  href={link}
                  className="shrink-0 text-xs bg-white text-fuchsia-700 font-bold px-3 py-1 rounded-md shadow-md hover:bg-fuchsia-50 transition-all flex items-center gap-1 group"
                >
                  <span>Read More</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors shrink-0 focus:outline-none"
              aria-label="Dismiss notice"
            >
              <X size={18} className="text-white/90 hover:text-white" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
