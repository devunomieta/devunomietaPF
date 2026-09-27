"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmLead, ActionResult } from "@/lib/crm/types";
import { saveLead } from "./actions";

export function LeadForm({
  lead,
  onDone,
  onCancel,
}: {
  lead?: CrmLead | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { toast } = useCrmFeedback();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result: ActionResult = await saveLead(formData, lead?.id);
    setLoading(false);
    if ("success" in result) onDone();
    else toast(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className={crmLabelClass} htmlFor="name">Name *</label>
        <input id="name" name="name" required defaultValue={lead?.name} className={crmInputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={lead?.email || ""} className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={lead?.phone || ""} className={crmInputClass} placeholder="+234..." />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="company">Company</label>
          <input id="company" name="company" defaultValue={lead?.company || ""} className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="score">Score</label>
          <input id="score" name="score" type="number" min={0} max={100} defaultValue={lead?.score ?? 0} className={crmInputClass} />
        </div>
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="tags">Tags (comma separated)</label>
        <input id="tags" name="tags" defaultValue={lead?.tags?.join(", ") || ""} className={crmInputClass} placeholder="referral, hot" />
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={lead?.notes || ""} className={crmInputClass} />
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onCancel} className={crmSecondaryBtnClass}>Cancel</button>
        <button type="submit" disabled={loading} className={crmPrimaryBtnClass}>
          {loading && <Loader2 size={15} className="animate-spin" />}
          Save
        </button>
      </div>
    </form>
  );
}
