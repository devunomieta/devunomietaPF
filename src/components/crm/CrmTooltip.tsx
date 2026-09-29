"use client";

import { useState } from "react";
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

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[position];

  return (
    <div
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
          className={`absolute ${positionClasses} z-50 px-2.5 py-1.5 text-xs text-foreground bg-popover/95 border border-border rounded-lg shadow-xl backdrop-blur-md max-w-xs whitespace-normal pointer-events-none transition-all animate-in fade-in-0 zoom-in-95`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
