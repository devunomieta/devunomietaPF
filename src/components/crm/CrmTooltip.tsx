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
  const [actualPosition, setActualPosition] = useState<"top" | "bottom">(
    position === "bottom" ? "bottom" : "top"
  );
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    width: "max-content",
    maxWidth: "240px",
  });
  const triggerRef = useRef<HTMLDivElement>(null);

  // Position calculation to strictly keep tooltip within viewport
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Decide vertical orientation:
    let isBottom = position === "bottom";
    if (rect.top < 90) {
      isBottom = true;
    } else if (viewportHeight - rect.bottom < 90) {
      isBottom = false;
    }
    setActualPosition(isBottom ? "bottom" : "top");

    // Standard comfortable tooltip width (between 200px and 260px)
    const targetWidth = Math.min(240, viewportWidth - 32);
    const triggerCenter = rect.left + rect.width / 2;

    let left = "50%";
    let transform = "translateX(-50%)";

    // If trigger is very close to left screen edge:
    // Left edge of tooltip should be at least 16px from left screen edge
    const offsetFromTriggerLeft = 16 - rect.left;
    const offsetFromTriggerRight = (viewportWidth - 16) - rect.right;

    if (triggerCenter - targetWidth / 2 < 16) {
      // Pin to 16px from screen left
      left = `${offsetFromTriggerLeft}px`;
      transform = "none";
    } else if (triggerCenter + targetWidth / 2 > viewportWidth - 16) {
      // Pin to 16px from screen right
      left = `calc(100% - ${targetWidth}px + ${offsetFromTriggerRight}px)`;
      transform = "none";
    }

    setTooltipStyle({
      width: `${targetWidth}px`,
      maxWidth: `${targetWidth}px`,
      left,
      transform,
    });
  };

  useEffect(() => {
    if (visible) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, { passive: true });
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [visible, position]);

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
          style={tooltipStyle}
          className={`absolute ${
            actualPosition === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          } z-50 p-2.5 text-xs text-foreground bg-popover border border-border rounded-xl shadow-2xl backdrop-blur-md whitespace-normal pointer-events-none transition-all animate-in fade-in-0 zoom-in-95 leading-relaxed`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
