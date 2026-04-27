"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { Terminal, ArrowRight, X, Play } from "lucide-react";

const TOUR_STEPS = [
  { path: "/", title: "README.md", desc: "Welcome! Here is my profile overview." },
  { path: "/experience", title: "Commit History", desc: "See my past roles and achievements." },
  { path: "/projects", title: "Repositories", desc: "Check out the projects I've built." },
  { path: "/academic", title: "Wiki", desc: "My academic background and research lab." },
];

export function TourGuide() {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const hasSeenTour = localStorage.getItem("devunomieta_tour_seen");
    
    // Listen for custom event to restart tour manually
    const startTour = () => {
      localStorage.removeItem("devunomieta_tour_seen");
      setCurrentStepIndex(0);
      setIsTourActive(true);
      if (window.location.pathname !== "/") {
        router.push("/");
      }
    };
    
    window.addEventListener("start-tour", startTour);

    if (!hasSeenTour) {
      // Auto-start on first visit after a short delay
      const timer = setTimeout(() => {
        setIsTourActive(true);
        const index = TOUR_STEPS.findIndex((step) => step.path === window.location.pathname);
        if (index !== -1) setCurrentStepIndex((prev) => prev !== index ? index : prev);
      }, 1500);
      return () => clearTimeout(timer);
    }
    
    return () => window.removeEventListener("start-tour", startTour);
  }, [router]);

  // Sync index if user navigates manually during tour
  useEffect(() => {
    if (isTourActive) {
      const index = TOUR_STEPS.findIndex((step) => step.path === pathname);
      if (index !== -1) {
        setCurrentStepIndex((prev) => prev !== index ? index : prev);
      }
    }
  }, [pathname, isTourActive]);

  const nextStep = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      // We just push route; the useEffect above will sync the index
      router.push(TOUR_STEPS[nextIdx].path);
    } else {
      endTour();
    }
  };

  const endTour = () => {
    setIsTourActive(false);
    localStorage.setItem("devunomieta_tour_seen", "true");
  };

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {isTourActive && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-0 right-0 left-0 sm:bottom-6 sm:right-6 sm:left-auto z-50 w-full sm:w-80 bg-background border-t sm:border border-accent-green rounded-t-2xl sm:rounded-xl shadow-[0_-4px_20px_rgba(35,134,54,0.15)] sm:shadow-[0_0_20px_rgba(35,134,54,0.15)] p-5 sm:p-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-2">
              <div className="flex items-center gap-2 text-accent-green">
                <Terminal size={18} className="sm:w-4 sm:h-4" />
                <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  Guided Tour ({currentStepIndex + 1}/{TOUR_STEPS.length})
                </span>
              </div>
              <button onClick={endTour} className="text-muted hover:text-foreground transition-colors p-2 -mr-2">
                <X size={20} className="sm:w-4 sm:h-4" />
              </button>
            </div>
            
            <h3 className="font-semibold text-foreground text-base sm:text-sm mb-1.5 sm:mb-1">{TOUR_STEPS[currentStepIndex].title}</h3>
            <p className="text-muted text-sm sm:text-xs mb-5 sm:mb-4 leading-relaxed">{TOUR_STEPS[currentStepIndex].desc}</p>
            
            <div className="flex justify-between items-center mt-auto pt-3 border-t border-border">
              <div className="flex gap-1.5 sm:gap-1">
                {TOUR_STEPS.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStepIndex ? "w-5 sm:w-4 bg-accent-green" : "w-1.5 bg-border"}`}
                  />
                ))}
              </div>
              <button
                onClick={nextStep}
                className="flex items-center gap-2 bg-accent-green hover:bg-accent-green/90 text-white px-4 sm:px-3 py-2 sm:py-1.5 rounded-md text-sm sm:text-xs font-semibold transition-colors shadow-lg shadow-accent-green/20"
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next Page"}
                {currentStepIndex !== TOUR_STEPS.length - 1 && <ArrowRight size={16} className="sm:w-3.5 sm:h-3.5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Optional trigger to restart the tour placed in a subtle corner, or can be triggered from anywhere */}
      {!isTourActive && (
        <button 
          onClick={() => window.dispatchEvent(new Event("start-tour"))}
          className="fixed bottom-4 left-4 z-40 w-8 h-8 rounded-full bg-header border border-border flex items-center justify-center text-muted hover:text-accent-green hover:border-accent-green transition-all group"
          title="Restart Tour"
        >
          <Play size={14} className="group-hover:scale-110 transition-transform" />
        </button>
      )}
    </>
  );
}
