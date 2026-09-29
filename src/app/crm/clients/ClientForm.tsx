"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmClient, ActionResult } from "@/lib/crm/types";
import { saveClient } from "./actions";

export function ClientForm({
  client,
  onDone,
  onCancel,
}: {
  client?: CrmClient | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { toast } = useCrmFeedback();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result: ActionResult = await saveClient(formData, client?.id);
    setLoading(false);
    if ("success" in result) onDone();
    else toast(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className={crmLabelClass} htmlFor="name">Name *</label>
        <input id="name" name="name" required defaultValue={client?.name} className={crmInputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={client?.email || ""} className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={client?.phone || ""} className={crmInputClass} placeholder="+234..." />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="company">Company</label>
          <input id="company" name="company" defaultValue={client?.company || ""} className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={client?.status || "active"} className={crmInputClass}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="location">Location</label>
          <input id="location" name="location" defaultValue={client?.location || ""} className={crmInputClass} placeholder="e.g. London, UK" />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="website">Website</label>
          <input id="website" name="website" type="text" defaultValue={client?.website || ""} className={crmInputClass} placeholder="https://example.com" />
        </div>
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="pain_points">Pain Points (Identified Problems)</label>
        <textarea id="pain_points" name="pain_points" rows={2} defaultValue={client?.pain_points || ""} className={crmInputClass} placeholder="Key challenges or problems identified..." />
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="proposed_solution">Proposed Solution</label>
        <textarea id="proposed_solution" name="proposed_solution" rows={2} defaultValue={client?.proposed_solution || ""} className={crmInputClass} placeholder="Solutions delivered or proposed..." />
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="tags">Tags (comma separated)</label>
        <input id="tags" name="tags" defaultValue={client?.tags?.join(", ") || ""} className={crmInputClass} placeholder="vip, retainer" />
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={client?.notes || ""} className={crmInputClass} />
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onCancel} className={crmSecondaryBtnClass}>
          Cancel
        </button>
        <button type="submit" disabled={loading} className={crmPrimaryBtnClass}>
          {loading && <Loader2 size={15} className="animate-spin" />}
          Save
        </button>
      </div>
    </form>
  );
}
