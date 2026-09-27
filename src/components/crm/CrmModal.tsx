"use client";

import { X } from "lucide-react";

export function CrmModal({
  open,
  onClose,
  title,
  children,
  widthClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${widthClassName || "max-w-lg"} max-h-[90vh] overflow-y-auto bg-background border border-border rounded-xl p-5 sm:p-6`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const crmInputClass =
  "w-full bg-header/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-accent-blue outline-none";

export const crmLabelClass = "text-xs font-semibold text-foreground uppercase tracking-wider mb-1 block";

export const crmPrimaryBtnClass =
  "px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center";

export const crmSecondaryBtnClass =
  "px-4 py-2 border border-border text-foreground rounded-lg hover:bg-header/50 transition-all text-sm";
