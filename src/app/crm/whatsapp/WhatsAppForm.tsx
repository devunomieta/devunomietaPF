"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Users, Shuffle, Sparkles, HelpCircle, ShieldCheck } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { sendSingleWhatsApp, createBulkWhatsApp, previewWhatsAppAudienceCount } from "./actions";
import { hasSpintax, generateVariations } from "@/lib/crm/spintax";

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

  // Message state for interactive preview
  const [message, setMessage] = useState(
    prefillRecipient ? `Hi ${prefillRecipient.name.split(" ")[0]}, ` : "{Hi|Hello|Hey} {{first_name}}, "
  );
  const [previewVariations, setPreviewVariations] = useState<string[]>([]);
  const [showSpintaxGuide, setShowSpintaxGuide] = useState(false);

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

  function handleShufflePreview() {
    if (!message.trim()) {
      toast("Please enter a message template first.", "error");
      return;
    }
    const variations = generateVariations(
      message,
      {
        name: "Alex Johnson",
        company: "Acme Corp",
      },
      3
    );
    setPreviewVariations(variations);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = mode === "single" ? await sendSingleWhatsApp(formData) : await createBulkWhatsApp(formData);
    setLoading(false);
    if ("success" in result) {
      const warning = (result as { warning?: string }).warning;
      toast(warning || "Sent.", warning ? "error" : "success");
      router.refresh();
    } else {
      toast(result.error);
    }
  }

  const containsSpintax = hasSpintax(message);

  return (
    <form onSubmit={handleSubmit} className="bg-header/20 border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            mode === "single" ? "bg-accent-blue text-white border-accent-blue" : "border-border text-muted hover:text-foreground"
          }`}
        >
          Single
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            mode === "bulk" ? "bg-accent-blue text-white border-accent-blue" : "border-border text-muted hover:text-foreground"
          }`}
        >
          Small batch
        </button>
      </div>

      {mode === "single" ? (
        <>
          <input type="hidden" name="clientId" value={prefillRecipient?.clientId || ""} />
          <input type="hidden" name="leadId" value={prefillRecipient?.leadId || ""} />
          <div>
            <label className={crmLabelClass} htmlFor="phone">Phone number *</label>
            <input
              id="phone"
              name="phone"
              required
              defaultValue={prefillRecipient?.phone || ""}
              className={crmInputClass}
              placeholder="+234..."
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={crmLabelClass} htmlFor="segment">Audience</label>
            <select
              id="segment"
              name="segment"
              value={segment}
              onChange={(e) => setSegment(e.target.value as "clients" | "leads")}
              className={crmInputClass}
            >
              <option value="leads">Leads</option>
              <option value="clients">Clients</option>
            </select>
          </div>
          <div>
            <label className={crmLabelClass} htmlFor="tags">Tags (optional)</label>
            <input
              id="tags"
              name="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. vip, design"
              className={crmInputClass}
            />
          </div>
          {segment === "leads" && (
            <div>
              <label className={crmLabelClass} htmlFor="stageKey">Stage (optional)</label>
              <select
                id="stageKey"
                name="stageKey"
                value={stageKey}
                onChange={(e) => setStageKey(e.target.value)}
                className={crmInputClass}
              >
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
        <div className="flex flex-col gap-2 text-xs bg-background/80 border border-border/80 rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Users size={15} className="text-accent-blue" />
            {audienceCount === null ? "Calculating audience…" : `${audienceCount} recipient(s) with a phone number`}
          </div>
          <div className="flex items-start gap-1.5 text-muted leading-relaxed">
            <ShieldCheck size={14} className="text-accent-green shrink-0 mt-0.5" />
            <span>
              <strong>Smart Anti-Ban Protection Active:</strong> Messages are sent with <strong>40–70s randomized jitter</strong>. For larger batches, the system introduces <strong>5–10 minute intermittent rest pauses every 5–10 messages</strong> to mimic human pacing.
            </span>
          </div>
        </div>
      )}

      {/* Message Area */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={crmLabelClass} htmlFor="message">Message *</label>
          {mode === "bulk" && (
            <button
              type="button"
              onClick={() => setShowSpintaxGuide(!showSpintaxGuide)}
              className="text-[11px] text-accent-blue hover:underline inline-flex items-center gap-1 font-medium"
            >
              <Sparkles size={12} />
              Spintax guide {showSpintaxGuide ? "▲" : "▼"}
            </button>
          )}
        </div>

        {showSpintaxGuide && (
          <div className="mb-3 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-xl text-xs text-foreground/90 flex flex-col gap-1.5">
            <p className="font-semibold text-accent-blue">How to use Spin Syntax (Spintax):</p>
            <p className="text-muted leading-relaxed">
              Wrap variations in curly brackets separated by vertical pipes: <code>{"{Option 1|Option 2|Option 3}"}</code>. Each recipient receives a randomly picked variation so no two messages appear identical.
            </p>
            <div className="bg-background/80 rounded-lg p-2 font-mono text-[11px] text-muted border border-border">
              {"{Hi|Hello|Hey} {{first_name}}, {hope you're having a good week|just checking in}!"}
            </div>
          </div>
        )}

        <textarea
          id="message"
          name="message"
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={crmInputClass}
          placeholder={"Hi {{first_name}}, ..."}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Tags: <code>{"{{first_name}}"}</code>, <code>{"{{company}}"}</code></span>
            {containsSpintax && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                ✓ Spintax active
              </span>
            )}
          </div>

          {mode === "bulk" && (
            <button
              type="button"
              onClick={handleShufflePreview}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-header/40 hover:bg-header/60 text-foreground border border-border transition-colors self-start sm:self-auto"
            >
              <Shuffle size={13} className="text-accent-blue" />
              Shuffle Preview
            </button>
          )}
        </div>
      </div>

      {/* Live Variations Preview */}
      {mode === "bulk" && previewVariations.length > 0 && (
        <div className="bg-header/30 border border-border/80 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Shuffle size={13} className="text-accent-blue" />
              Live Sample Variations (Generated for Recipients):
            </span>
            <button
              type="button"
              onClick={handleShufflePreview}
              className="text-[11px] text-accent-blue hover:underline font-medium"
            >
              Regenerate
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {previewVariations.map((variation, idx) => (
              <div
                key={idx}
                className="bg-background/90 border border-border/60 rounded-lg p-2.5 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed shadow-2xs"
              >
                <div className="text-[10px] text-muted font-semibold mb-1 uppercase tracking-wide">
                  Sample Recipient {idx + 1}:
                </div>
                {variation}
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="submit" disabled={loading || disabled} className={`${crmPrimaryBtnClass} self-start mt-1`}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {mode === "single" ? "Send" : "Send batch"}
      </button>
    </form>
  );
}
