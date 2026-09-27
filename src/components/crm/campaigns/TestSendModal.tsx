"use client";

import { useState, useEffect } from "react";
import { Mail, Send, Loader2, X, Check, AlertCircle } from "lucide-react";
import { sendTestCampaignEmail } from "@/app/crm/campaigns/actions";

type TestSendModalProps = {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  contentHtml: string;
};

export function TestSendModal({ isOpen, onClose, subject, contentHtml }: TestSendModalProps) {
  const [emailsInput, setEmailsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const emailList = emailsInput
      .split(/[,;\n]/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (emailList.length === 0) {
      setStatus({ success: false, message: "Please provide at least one valid email address." });
      return;
    }

    if (emailList.length > 5) {
      setStatus({ success: false, message: "Maximum 5 test email recipients allowed per test send." });
      return;
    }

    setLoading(true);
    try {
      const result = await sendTestCampaignEmail({
        emails: emailList,
        subject,
        html: contentHtml,
      });

      if ("error" in result) {
        setStatus({ success: false, message: result.error });
      } else {
        setStatus({
          success: true,
          message: `Test email successfully sent to ${emailList.join(", ")}! Check your inbox.`,
        });
      }
    } catch (err) {
      setStatus({
        success: false,
        message: err instanceof Error ? err.message : "Failed to send test email.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/15 text-accent-blue flex items-center justify-center">
              <Mail size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Send Test Email</h3>
              <p className="text-xs text-muted">Verify formatting directly in your inbox</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-foreground transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Recipient Email(s)
            </label>
            <textarea
              rows={3}
              value={emailsInput}
              onChange={(e) => setEmailsInput(e.target.value)}
              placeholder="e.g. yourname@domain.com, colleague@domain.com"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent-blue resize-none"
              disabled={loading}
              autoFocus
            />
            <p className="text-[11px] text-muted mt-1">
              Separate multiple emails with commas or newlines (up to 5 mailboxes).
            </p>
          </div>

          <div className="bg-header/20 border border-border rounded-lg p-2.5 text-xs text-muted space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <span>Subject:</span>
              <span className="text-accent-blue truncate">[TEST] {subject || "(No subject)"}</span>
            </div>
            <p className="text-[11px]">
              Personalization tokens will be populated with realistic sample data (e.g. Dr. Sarah Johnson).
            </p>
          </div>

          {status && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                status.success
                  ? "bg-accent-green/10 border border-accent-green/20 text-accent-green"
                  : "bg-red-400/10 border border-red-400/20 text-red-400"
              }`}
            >
              {status.success ? <Check size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
              <span>{status.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-foreground transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={13} />
                  Send Test
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
