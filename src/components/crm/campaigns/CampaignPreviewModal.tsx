"use client";

import { useState, useEffect } from "react";
import { Monitor, Tablet, Smartphone, Sun, Moon, X, Sparkles, Check, AlertCircle } from "lucide-react";
import { renderBulletproofEmail } from "@/lib/crm/emailTemplate";
import { personalizeText } from "@/lib/crm/personalization";

type CampaignPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  contentHtml: string;
  senderName?: string;
};

const SAMPLE_PROFILES = [
  {
    label: "Lead: Dr. Sarah Johnson",
    data: {
      name: "Dr. Sarah Johnson",
      first_name: "Sarah",
      last_name: "Johnson",
      company: "Apex Diagnostic Laboratories",
      email: "sarah.j@apexdiagnostics.com",
      phone: "+1 (555) 234-8890",
    },
  },
  {
    label: "Client: Michael Chen",
    data: {
      name: "Michael Chen",
      first_name: "Michael",
      last_name: "Chen",
      company: "St. Jude Pathology Services",
      email: "mchen@stjudepath.org",
      phone: "+1 (555) 910-1200",
    },
  },
];

export function CampaignPreviewModal({
  isOpen,
  onClose,
  subject,
  contentHtml,
  senderName = "Joseph Unomieta",
}: CampaignPreviewModalProps) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [profileIndex, setProfileIndex] = useState(0);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeProfile = SAMPLE_PROFILES[profileIndex].data;
  const personalizedSubject = personalizeText(subject || "(No subject)", activeProfile);
  const personalizedBody = personalizeText(contentHtml || "<p>No content provided yet...</p>", activeProfile);

  // Generate full HTML
  const emailHtml = renderBulletproofEmail({
    subject: personalizedSubject,
    contentHtml: personalizedBody,
    brandName: senderName,
    senderAddress: "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-header/40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-pulse" />
              Campaign Preview
            </span>
            <span className="text-xs text-muted hidden sm:inline">· Exact recipient rendering</span>
          </div>

          {/* Device & Theme Toggles */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Device Switcher */}
            <div className="flex items-center bg-background/80 border border-border rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                  device === "desktop" ? "bg-accent-blue text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
                title="Desktop View (600px)"
              >
                <Monitor size={15} />
                <span className="hidden md:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("tablet")}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                  device === "tablet" ? "bg-accent-blue text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
                title="Tablet View (480px)"
              >
                <Tablet size={15} />
                <span className="hidden md:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                  device === "mobile" ? "bg-accent-blue text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone size={15} />
                <span className="hidden md:inline">Mobile</span>
              </button>
            </div>

            {/* Light / Dark Mode Switcher */}
            <div className="flex items-center bg-background/80 border border-border rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                  theme === "light" ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-muted hover:text-foreground"
                }`}
                title="Simulate Light Mode Email Client"
              >
                <Sun size={15} />
                <span className="hidden sm:inline">Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                  theme === "dark" ? "bg-accent-blue/20 text-accent-blue font-semibold" : "text-muted hover:text-foreground"
                }`}
                title="Simulate Dark Mode Email Client"
              >
                <Moon size={15} />
                <span className="hidden sm:inline">Dark</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-muted/20 transition"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Subheader: Subject, Sample Profile Selector & Deliverability checks */}
        <div className="px-5 py-2.5 bg-background/60 border-b border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="text-muted font-medium uppercase tracking-wider text-[10px]">Subject:</span>
            <span className="font-semibold text-foreground truncate max-w-md">{personalizedSubject}</span>
            {subject.length > 50 && (
              <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <AlertCircle size={10} /> &gt;50 chars (may clip on phones)
              </span>
            )}
          </div>

          {/* Sample Recipient Selector */}
          <div className="flex items-center gap-2">
            <span className="text-muted flex items-center gap-1">
              <Sparkles size={12} className="text-accent-blue" />
              Preview as:
            </span>
            <select
              value={profileIndex}
              onChange={(e) => setProfileIndex(Number(e.target.value))}
              className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent-blue cursor-pointer"
            >
              {SAMPLE_PROFILES.map((p, idx) => (
                <option key={idx} value={idx}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Viewport Canvas Frame */}
        <div className="flex-1 bg-black/40 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
          <div
            className={`transition-all duration-300 flex flex-col shadow-2xl rounded-2xl overflow-hidden border ${
              device === "mobile"
                ? "w-[375px] h-[660px] border-neutral-700 bg-neutral-900 ring-8 ring-neutral-800"
                : device === "tablet"
                ? "w-[500px] h-[720px] border-neutral-700 bg-neutral-900 ring-4 ring-neutral-800"
                : "w-full max-w-[680px] h-full border-border bg-card"
            }`}
          >
            {/* Simulated Phone Top Speaker & Notch if mobile */}
            {device === "mobile" && (
              <div className="w-full bg-neutral-900 h-6 flex items-center justify-center shrink-0 border-b border-neutral-800">
                <div className="w-16 h-1 rounded-full bg-neutral-700" />
              </div>
            )}

            {/* Email Client Inbox Header Bar */}
            <div
              className={`px-4 py-2 text-xs border-b flex items-center justify-between shrink-0 ${
                theme === "dark" ? "bg-neutral-900 border-neutral-800 text-neutral-300" : "bg-neutral-100 border-neutral-200 text-neutral-700"
              }`}
            >
              <div className="truncate">
                <span className="font-semibold">{senderName}</span>
                <span className="text-[11px] opacity-70 ml-1.5">&lt;hello@unomieta.com&gt;</span>
              </div>
              <div className="text-[11px] opacity-60">Just now</div>
            </div>

            {/* Injected Sandboxed Iframe with rendered HTML */}
            <div className="flex-1 w-full h-full relative">
              <iframe
                title="Email Preview"
                srcDoc={
                  theme === "dark"
                    ? emailHtml.replace(
                        "<head>",
                        `<head><style>:root { color-scheme: dark !important; } body, .email-body-bg { background-color: #0b0f19 !important; } .email-container { background-color: #111827 !important; border-color: #1f2937 !important; color: #f3f4f6 !important; } .email-text { color: #d1d5db !important; } .email-heading { color: #f9fafb !important; } .email-muted { color: #9ca3af !important; } a { color: #60a5fa !important; }</style>`
                      )
                    : emailHtml.replace(
                        "<head>",
                        `<head><style>:root { color-scheme: light !important; } body, .email-body-bg { background-color: #f3f4f6 !important; } .email-container { background-color: #ffffff !important; border-color: #e5e7eb !important; color: #1f2937 !important; } .email-text { color: #374151 !important; } .email-heading { color: #111827 !important; } .email-muted { color: #6b7280 !important; } a { color: #2563eb !important; }</style>`
                      )
                }
                className="w-full h-full border-none"
                sandbox="allow-same-origin allow-popups"
              />
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <div className="px-5 py-2.5 bg-card border-t border-border flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-1.5 text-accent-green">
            <Check size={14} />
            <span>Responsive 600px table & Dark Mode fallback styles loaded</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-muted/20 hover:bg-muted/30 text-foreground transition"
          >
            Done Previewing
          </button>
        </div>
      </div>
    </div>
  );
}
