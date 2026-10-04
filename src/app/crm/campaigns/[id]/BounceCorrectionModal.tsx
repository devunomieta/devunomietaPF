"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  X, 
  AlertTriangle, 
  Check, 
  ExternalLink, 
  Loader2, 
  Send, 
  UserCheck, 
  Edit3, 
  ShieldAlert,
  Save
} from "lucide-react";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { 
  correctBouncedRecipientAndRelink, 
  type BouncedRecipientInfo 
} from "../actions";

interface BounceCorrectionModalProps {
  campaignId: string;
  bounces: BouncedRecipientInfo[];
  onClose: () => void;
  onRefresh: () => void;
}

export function BounceCorrectionModal({
  campaignId,
  bounces,
  onClose,
  onRefresh,
}: BounceCorrectionModalProps) {
  const router = useRouter();
  const { toast } = useCrmFeedback();
  
  // Local edit state per bounce
  const [correctedEmails, setCorrectedEmails] = useState<Record<string, string>>({});
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [resolvedStatus, setResolvedStatus] = useState<Record<string, boolean>>({});

  const handleEmailChange = (oldEmail: string, val: string) => {
    setCorrectedEmails((prev) => ({ ...prev, [oldEmail]: val }));
  };

  const handleSaveCorrection = async (bounce: BouncedRecipientInfo, idx: number) => {
    const newEmail = (correctedEmails[bounce.email] || "").trim();
    if (!newEmail || !newEmail.includes("@")) {
      toast("Please provide a valid email format.", "error");
      return;
    }

    setSavingIndex(idx);
    try {
      const res = await correctBouncedRecipientAndRelink({
        oldEmail: bounce.email,
        newEmail,
        targetType: bounce.entityType,
        targetId: bounce.contactId || bounce.leadId || bounce.clientId,
      });

      if ("error" in res) {
        toast(res.error, "error");
      } else {
        toast(`Linked ${newEmail} to ${bounce.entityName || bounce.contactName || bounce.entityType}.`, "success");
        setResolvedStatus((prev) => ({ ...prev, [bounce.email]: true }));
        onRefresh();
      }
    } catch {
      toast("Failed to update record.", "error");
    } finally {
      setSavingIndex(null);
    }
  };

  const handleOpenComposerWithAll = () => {
    // Collect all corrected emails, or original emails if not edited
    const finalEmails = bounces.map((b) => correctedEmails[b.email]?.trim() || b.email);
    const validEmails = Array.from(new Set(finalEmails.filter((e) => e.includes("@"))));

    if (validEmails.length === 0) {
      toast("No valid emails available to compose.", "error");
      return;
    }

    router.push(
      `/crm/campaigns/new?resendCampaignId=${campaignId}&resendSegment=bounced`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-header/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Bounce Recovery &amp; Email Correction</h2>
              <p className="text-xs text-muted">
                {bounces.length} bounced recipient(s) found. Correct invalid addresses, update lead records, and resend.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-header/40 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-3">
          {bounces.length === 0 ? (
            <div className="text-center py-10 text-muted text-sm">
              No bounced recipients detected for this campaign.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bounces.map((b, idx) => {
                const isResolved = resolvedStatus[b.email];
                const isSaving = savingIndex === idx;
                const currentVal = correctedEmails[b.email] ?? "";

                return (
                  <div
                    key={b.email}
                    className={`border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isResolved
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : "bg-header/10 border-border/80 hover:border-border"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-foreground break-all">{b.email}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                            b.bounceType === "hard_bounce"
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                          }`}
                        >
                          {b.bounceType === "hard_bounce" ? "Hard Bounce" : "Soft Bounce"}
                        </span>
                        {isResolved && (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                            <Check size={10} /> Corrected
                          </span>
                        )}
                      </div>

                      {/* Associated Entity Info */}
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <UserCheck size={12} className="text-accent-blue" />
                        <span>
                          Linked to:{" "}
                          <strong className="text-foreground">
                            {b.entityName || b.contactName || "Unlinked / Direct"}
                          </strong>{" "}
                          ({b.entityType})
                        </span>
                      </div>
                    </div>

                    {/* Inline Correction Input & Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="Enter corrected email..."
                          value={currentVal}
                          onChange={(e) => handleEmailChange(b.email, e.target.value)}
                          disabled={isSaving || isResolved}
                          className="w-48 sm:w-56 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-header/40 text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue disabled:opacity-60"
                        />
                      </div>

                      <button
                        onClick={() => handleSaveCorrection(b, idx)}
                        disabled={isSaving || isResolved || !currentVal}
                        className="px-2.5 py-1.5 rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Update entity in CRM & save new email"
                      >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border bg-header/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-accent-green" />
            Saving a corrected address automatically clears it from the suppression list.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-border bg-header/20 hover:bg-header/50 text-foreground text-xs font-semibold transition cursor-pointer"
            >
              Done
            </button>
            <button
              onClick={handleOpenComposerWithAll}
              className="px-3.5 py-1.5 rounded-xl bg-accent-blue text-white hover:bg-accent-blue/90 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Send size={12} />
              Open in Campaign Composer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
