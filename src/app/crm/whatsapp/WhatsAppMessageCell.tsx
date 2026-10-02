"use client";

import { useState } from "react";
import { Eye, X, MessageSquare, Copy, Check } from "lucide-react";

export function WhatsAppMessageCell({
  message,
  phone,
  date,
}: {
  message: string | null;
  phone?: string;
  date?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!message) {
    return <span className="text-muted text-xs">—</span>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // quiet copy fail
    }
  };

  return (
    <>
      {/* Table cell: Always compact & clean */}
      <div className="flex items-center gap-1.5 min-w-0 max-w-full">
        <span className="truncate block flex-1 text-foreground/90 text-xs sm:text-sm font-normal" title={message}>
          {message}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="View full message in popup"
          className="shrink-0 p-1 rounded-md text-muted hover:text-accent-blue hover:bg-header/60 transition-colors cursor-pointer"
        >
          <Eye size={13} />
        </button>
      </div>

      {/* Full Message Popup Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-panel border border-border rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative flex flex-col gap-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-accent-blue shrink-0" size={18} />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">WhatsApp Message Details</h3>
                  {(phone || date) && (
                    <p className="text-[11px] text-muted">
                      {phone ? `To: +${phone}` : ""} {phone && date ? "•" : ""} {date ? new Date(date).toLocaleString() : ""}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground text-sm p-1.5 rounded-lg hover:bg-header transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message Body */}
            <div className="bg-header/50 border border-border/80 rounded-xl p-4 max-h-[60vh] overflow-y-auto">
              <p className="whitespace-pre-wrap break-words text-xs sm:text-sm text-foreground/95 leading-relaxed selection:bg-accent-blue/30">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-header/60 hover:bg-header border border-border text-foreground transition-colors cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy Message"}</span>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-accent-blue hover:bg-accent-blue/90 text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
