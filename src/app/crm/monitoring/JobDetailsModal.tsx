"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Eye, AlertCircle } from "lucide-react";
import { CrmModal } from "@/components/crm/CrmModal";

export type RecipientStatusItem = {
  phone: string;
  name?: string;
  status: "sent" | "failed" | "pending";
  error?: string;
  sentAt?: string;
  providerMessageId?: string | null;
};

import { cancelJobAction } from "./actions";
import { Loader2, StopCircle } from "lucide-react";

import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";

export function JobDetailsModal({
  jobId,
  jobType,
  total,
  progress,
  status,
  results = [],
  recipients = [],
}: {
  jobId: string;
  jobType: string;
  total: number;
  progress: number;
  status: string;
  results?: RecipientStatusItem[];
  recipients?: Array<{ phone?: string; email?: string; name?: string }>;
}) {
  const { confirm, toast } = useCrmFeedback();
  const [open, setOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  async function handleCancelJob() {
    const ok = await confirm("Are you sure you want to stop this job? Any unsent recipients will be aborted.", {
      title: "Stop Background Job",
      confirmLabel: "Stop Job",
      danger: true,
    });
    if (!ok) return;

    setCanceling(true);
    const res = await cancelJobAction(jobId);
    setCanceling(false);
    if ("success" in res) {
      setCurrentStatus("canceled");
      toast("Job has been stopped successfully.", "success");
    } else {
      toast(res.error || "Failed to stop job.", "error");
    }
  }

  // Construct complete merged list
  const displayItems: RecipientStatusItem[] = [];

  // Results recorded so far
  const resultsByTarget = new Map<string, RecipientStatusItem>();
  for (const r of results) {
    resultsByTarget.set(r.phone, r);
  }

  // Iterate over declared recipients in payload
  for (let i = 0; i < recipients.length; i++) {
    const raw = recipients[i];
    const target = raw.phone || raw.email || `Recipient #${i + 1}`;
    if (resultsByTarget.has(target)) {
      displayItems.push(resultsByTarget.get(target)!);
    } else {
      displayItems.push({
        phone: target,
        name: raw.name,
        status: i < progress ? "sent" : "pending",
      });
    }
  }

  // If no recipients array in payload, fall back to results
  if (displayItems.length === 0 && results.length > 0) {
    displayItems.push(...results);
  }

  const sentCount = displayItems.filter((i) => i.status === "sent").length;
  const failedCount = displayItems.filter((i) => i.status === "failed").length;
  const pendingCount = displayItems.filter((i) => i.status === "pending").length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/30 transition-colors"
      >
        <Eye size={11} />
        View Details
      </button>

      {open && (
        <CrmModal
          title={`Job Details: ${jobType.replace("_", " ").toUpperCase()}`}
          open={open}
          onClose={() => setOpen(false)}
        >
          <div className="flex flex-col gap-4">
            {/* Summary stat cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                <div className="text-[10px] uppercase font-bold text-emerald-400">Sent</div>
                <div className="text-base font-bold text-emerald-300 mt-0.5">{sentCount}</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                <div className="text-[10px] uppercase font-bold text-red-400">Failed</div>
                <div className="text-base font-bold text-red-300 mt-0.5">{failedCount}</div>
              </div>
              <div className="bg-header border border-border rounded-lg p-2.5">
                <div className="text-[10px] uppercase font-bold text-muted">Pending</div>
                <div className="text-base font-bold text-foreground mt-0.5">{pendingCount}</div>
              </div>
            </div>

            {/* List */}
            <div className="border border-border/80 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {displayItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted">
                  No recipient breakdown available for this job.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {displayItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-start justify-between gap-2 text-xs bg-header/20 hover:bg-header/40 transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground font-mono">
                          {item.name ? `${item.name} (${item.phone})` : item.phone}
                        </span>
                        {item.error && (
                          <span className="text-[11px] text-red-400 flex items-center gap-1">
                            <AlertCircle size={10} className="shrink-0" />
                            {item.error}
                          </span>
                        )}
                        {item.sentAt && (
                          <span className="text-[10px] text-muted">
                            {new Date(item.sentAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0 ${
                          item.status === "sent"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : item.status === "failed"
                              ? "bg-red-400/15 text-red-400 border border-red-400/25"
                              : "bg-muted/15 text-muted border border-border"
                        }`}
                      >
                        {item.status === "sent" ? (
                          <CheckCircle2 size={11} />
                        ) : item.status === "failed" ? (
                          <XCircle size={11} />
                        ) : (
                          <Clock size={11} />
                        )}
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              {(currentStatus === "queued" || currentStatus === "processing") ? (
                <button
                  type="button"
                  onClick={handleCancelJob}
                  disabled={canceling}
                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-red-400/30 rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors"
                >
                  {canceling ? <Loader2 size={12} className="animate-spin" /> : <StopCircle size={12} />}
                  Stop / Cancel Job
                </button>
              ) : (
                <span className="text-xs text-muted">Status: <strong className="capitalize">{currentStatus}</strong></span>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 text-xs text-muted hover:text-foreground border border-border rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </CrmModal>
      )}
    </>
  );
}
