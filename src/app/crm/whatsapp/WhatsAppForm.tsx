"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Users } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { sendSingleWhatsApp, createBulkWhatsApp, previewWhatsAppAudienceCount } from "./actions";

type PrefillRecipient = { id: string; name: string; phone: string | null; clientId: string | null; leadId: string | null };

export function WhatsAppForm({
  stages,
  disabled,
  prefillRecipient,
}: {
  stages: CrmJourneyStage[];
  disabled: boolean;
  prefillRecipient: PrefillRecipient | null;
}) {
  const router = useRouter();
  const { toast } = useCrmFeedback();
  const [mode, setMode] = useState<"single" | "bulk">(prefillRecipient ? "single" : "bulk");
  const [segment, setSegment] = useState<"clients" | "leads">("leads");
  const [tags, setTags] = useState("");
  const [stageKey, setStageKey] = useState("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "bulk") return;
    const timeout = setTimeout(async () => {
      const result = await previewWhatsAppAudienceCount({
        segment,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        stageKey,
      });
      setAudienceCount(result.count);
    }, 300);
    return () => clearTimeout(timeout);
  }, [mode, segment, tags, stageKey]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = mode === "single" ? await sendSingleWhatsApp(formData) : await createBulkWhatsApp(formData);
    setLoading(false);
    if ("success" in result) router.refresh();
    else toast(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-header/20 border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("single")} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${mode === "single" ? "bg-accent-blue text-white border-accent-blue" : "border-border text-muted"}`}>
          Single
        </button>
        <button type="button" onClick={() => setMode("bulk")} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${mode === "bulk" ? "bg-accent-blue text-white border-accent-blue" : "border-border text-muted"}`}>
          Small batch
        </button>
      </div>

      {mode === "single" ? (
        <>
          <input type="hidden" name="clientId" value={prefillRecipient?.clientId || ""} />
          <input type="hidden" name="leadId" value={prefillRecipient?.leadId || ""} />
          <div>
            <label className={crmLabelClass} htmlFor="phone">Phone number *</label>
            <input id="phone" name="phone" required defaultValue={prefillRecipient?.phone || ""} className={crmInputClass} placeholder="+234..." />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={crmLabelClass} htmlFor="segment">Audience</label>
            <select id="segment" name="segment" value={segment} onChange={(e) => setSegment(e.target.value as "clients" | "leads")} className={crmInputClass}>
              <option value="leads">Leads</option>
              <option value="clients">Clients</option>
            </select>
          </div>
          <div>
            <label className={crmLabelClass} htmlFor="tags">Tags (optional)</label>
            <input id="tags" name="tags" value={tags} onChange={(e) => setTags(e.target.value)} className={crmInputClass} />
          </div>
          {segment === "leads" && (
            <div>
              <label className={crmLabelClass} htmlFor="stageKey">Stage (optional)</label>
              <select id="stageKey" name="stageKey" value={stageKey} onChange={(e) => setStageKey(e.target.value)} className={crmInputClass}>
                <option value="">Any stage</option>
                {stages.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {mode === "bulk" && (
        <div className="flex items-center gap-2 text-sm text-muted bg-background border border-border rounded-lg p-3">
          <Users size={15} />
          {audienceCount === null ? "Calculating audience…" : `${audienceCount} recipient(s) with a phone number`}
          {audienceCount !== null && audienceCount > 0 && (
            <span className="text-xs text-yellow-400 ml-auto">Sent with a delay between messages to protect the number.</span>
          )}
        </div>
      )}

      <div>
        <label className={crmLabelClass} htmlFor="message">Message *</label>
        <textarea id="message" name="message" rows={5} required className={crmInputClass} placeholder={"Hi {{first_name}}, ..."} />
        <p className="text-xs text-muted mt-1">Use <code>{"{{first_name}}"}</code> to personalize.</p>
      </div>

      <button type="submit" disabled={loading || disabled} className={`${crmPrimaryBtnClass} self-start`}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {mode === "single" ? "Send" : "Send batch"}
      </button>
    </form>
  );
}
