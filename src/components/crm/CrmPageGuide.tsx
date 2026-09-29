"use client";

import { useState, useEffect } from "react";
import { Info, ChevronDown, ChevronUp, X } from "lucide-react";

export function CrmPageGuide({
  pageKey,
  title,
  description,
  tips = [],
}: {
  pageKey: string;
  title: string;
  description: string;
  tips?: string[];
}) {
  const storageKey = `crm_guide_${pageKey}`;
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`${storageKey}_dismissed`);
      if (dismissed === "true") {
        setIsDismissed(true);
      } else {
        const storedOpen = localStorage.getItem(`${storageKey}_open`);
        if (storedOpen !== null) {
          setIsOpen(storedOpen === "true");
        } else {
          // Open by default on first visit for new users/assistants
          setIsOpen(true);
        }
      }
    } catch {
      // Fallback if localStorage blocked
    }
  }, [storageKey]);

  function toggleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(`${storageKey}_open`, String(next));
    } catch {}
  }

  function handleDismiss() {
    setIsDismissed(true);
    try {
      localStorage.setItem(`${storageKey}_dismissed`, "true");
    } catch {}
  }

  function handleReopen() {
    setIsDismissed(false);
    setIsOpen(true);
    try {
      localStorage.removeItem(`${storageKey}_dismissed`);
      localStorage.setItem(`${storageKey}_open`, "true");
    } catch {}
  }

  if (isDismissed) {
    return (
      <div className="flex justify-end -mt-3 mb-1">
        <button
          onClick={handleReopen}
          className="text-[11px] text-muted hover:text-accent-blue inline-flex items-center gap-1 transition-colors px-2 py-0.5 rounded border border-border/40 hover:border-accent-blue/30 bg-header/10"
        >
          <Info size={11} /> Guide: {title}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-accent-blue/5 via-header/30 to-header/10 border border-border/80 rounded-xl p-4 transition-all">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={toggleOpen}
          className="flex items-center gap-2 text-left group flex-1"
        >
          <div className="w-6 h-6 rounded-md bg-accent-blue/15 text-accent-blue flex items-center justify-center shrink-0">
            <Info size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground tracking-wide group-hover:text-accent-blue transition-colors flex items-center gap-1.5">
              {title}
              <span className="text-[10px] font-normal text-muted bg-header/50 px-1.5 py-0.2 rounded border border-border/50">
                Guide
              </span>
            </h3>
            {!isOpen && (
              <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleOpen}
            className="p-1 text-muted hover:text-foreground rounded transition-colors"
            aria-label={isOpen ? "Collapse guide" : "Expand guide"}
          >
            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-muted hover:text-red-400 rounded transition-colors ml-1"
            title="Dismiss guide"
            aria-label="Dismiss guide"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-border/60 text-xs text-foreground/90 space-y-2.5 animate-in fade-in-0 duration-200">
          <p className="leading-relaxed">{description}</p>
          {tips.length > 0 && (
            <div className="bg-header/40 rounded-lg p-2.5 border border-border/40">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Helpful Tips & How it Works:
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-muted">
                {tips.map((tip, idx) => (
                  <li key={idx} className="leading-normal">
                    <span className="text-foreground/90">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
