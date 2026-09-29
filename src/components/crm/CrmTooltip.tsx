"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";

export function CrmTooltip({
  text,
  children,
  position = "top",
}: {
  text: string;
  children?: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const [visible, setVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState<"top" | "bottom" | "left" | "right">(position);
  const [alignRight, setAlignRight] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Auto-detect if tooltip will be cut off by top, bottom, or right edge of viewport
  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // If trigger is within 85px of top viewport edge, flip to bottom
      if (position === "top" && rect.top < 85) {
        setActualPosition("bottom");
      } else if (position === "bottom" && window.innerHeight - rect.bottom < 85) {
        setActualPosition("top");
      } else {
        setActualPosition(position);
      }

      // If trigger is within 250px of the right window edge, anchor right edge to prevent cut-off
      if (viewportWidth - rect.right < 240) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
  }, [visible, position]);

  const horizontalAlignClass = alignRight 
    ? "right-0" 
    : "left-1/2 -translate-x-1/2";

  const positionClasses = {
    top: `bottom-full ${horizontalAlignClass} mb-2`,
    bottom: `top-full ${horizontalAlignClass} mt-2`,
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[actualPosition];

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible((v) => !v)}
    >
      {children ? (
        children
      ) : (
        <button
          type="button"
          aria-label="Help info"
          className="text-muted hover:text-accent-blue transition-colors p-0.5"
        >
          <HelpCircle size={13} />
        </button>
      )}

      {visible && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses} z-50 px-2.5 py-1.5 text-xs text-foreground bg-popover/95 border border-border rounded-lg shadow-xl backdrop-blur-md w-max max-w-[220px] sm:max-w-xs whitespace-normal pointer-events-none transition-all animate-in fade-in-0 zoom-in-95`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
