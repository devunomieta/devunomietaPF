"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Users, Shuffle, Sparkles, ShieldCheck, Tag, X, Search, Check } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { sendSingleWhatsApp, createBulkWhatsApp, previewWhatsAppAudienceCount } from "./actions";
import { hasSpintax, generateVariations } from "@/lib/crm/spintax";

type PrefillRecipient = { id: string; name: string; phone: string | null; clientId: string | null; leadId: string | null };

export function WhatsAppForm({
  stages,
  availableTags = [],
  disabled,
  prefillRecipient,
  prefillMessage,
  initialMode,
}: {
  stages: CrmJourneyStage[];
  availableTags?: string[];
  disabled: boolean;
  prefillRecipient: PrefillRecipient | null;
  prefillMessage?: string | null;
  initialMode?: "single" | "bulk" | null;
}) {
  const router = useRouter();
  const { toast } = useCrmFeedback();
  const [mode, setMode] = useState<"single" | "bulk">(
    initialMode || (prefillRecipient ? "single" : "bulk")
  );
  const [segment, setSegment] = useState<"clients" | "leads" | "all">("leads");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stageKey, setStageKey] = useState("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Searchable tag selector state
  const [tagSearchInput, setTagSearchInput] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Message state for interactive preview
  const [message, setMessage] = useState(
    prefillMessage ||
      (prefillRecipient
        ? `Hi ${prefillRecipient.name.split(" ")[0]}, `
        : "{Hi|Hello|Hey} {{first_name}}, ")
  );
  const [previewVariations, setPreviewVariations] = useState<string[]>([]);
  const [showSpintaxGuide, setShowSpintaxGuide] = useState(false);

  // Close tag dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSelectTag(tag: string) {
    if (!selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setTagSearchInput("");
  }

  function handleAddCustomTag() {
    const trimmed = tagSearchInput.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setTagSearchInput("");
  }

  // Filter recommendations:
  // When input has >= 3 chars, show matches from availableTags
  // When input has < 3 chars, show up to 6 recommendations (most recently used)
  const matchingTags = tagSearchInput.trim().length >= 3
    ? availableTags.filter((t) =>
        t.toLowerCase().includes(tagSearchInput.trim().toLowerCase())
      )
    : availableTags.slice(0, 6);

  useEffect(() => {
    if (mode !== "bulk") return;
    const timeout = setTimeout(async () => {
      const result = await previewWhatsAppAudienceCount({
        segment,
        tags: selectedTags,
        stageKey,
      });
      setAudienceCount(result.count);
    }, 250);
    return () => clearTimeout(timeout);
  }, [mode, segment, selectedTags, stageKey]);

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
    formData.set("segment", segment);
    formData.set("tags", selectedTags.join(","));
    formData.set("stageKey", stageKey);
    formData.set("message", message);

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
            mode === "single" ? "bg-accent-blue text-white border-accent-blue shadow-sm shadow-accent-blue/30" : "border-border text-muted hover:text-foreground"
          }`}
        >
          Single
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            mode === "bulk" ? "bg-accent-blue text-white border-accent-blue shadow-sm shadow-accent-blue/30" : "border-border text-muted hover:text-foreground"
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
        <div className="flex flex-col gap-4 bg-background/50 border border-border/80 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={crmLabelClass} htmlFor="segment">Audience</label>
              <select
                id="segment"
                name="segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value as "clients" | "leads" | "all")}
                className={crmInputClass}
              >
                <option value="leads">Leads</option>
                <option value="clients">Clients</option>
                <option value="all">ALL (Leads &amp; Clients combined)</option>
              </select>
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

          {/* Searchable Multi-Select Tag Input with Dropdown */}
          <div className="relative" ref={tagDropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className={crmLabelClass} style={{ marginBottom: 0 }}>
                Filter by Tags (Optional)
              </label>
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="text-[10px] text-muted hover:text-red-400 underline"
                >
                  Clear all ({selectedTags.length})
                </button>
              )}
            </div>

            {/* Selected Tag Chips */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2 p-2 bg-header/20 border border-border/80 rounded-lg">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent-blue/15 border border-accent-blue/30 text-accent-blue text-xs font-semibold rounded-md animate-in fade-in"
                  >
                    <Tag size={10} />
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove tag"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search Input Bar with Icon */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
              <input
                type="text"
                placeholder={
                  selectedTags.length > 0
                    ? "Add another tag or type to search..."
                    : "Search tags (e.g. VIP, Medical, Lead) or type 3+ chars..."
                }
                value={tagSearchInput}
                onFocus={() => setIsTagDropdownOpen(true)}
                onChange={(e) => {
                  setTagSearchInput(e.target.value);
                  setIsTagDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (matchingTags.length > 0 && tagSearchInput.trim().length >= 3) {
                      handleSelectTag(matchingTags[0]);
                    } else {
                      handleAddCustomTag();
                    }
                  }
                }}
                className={`${crmInputClass} pl-9 text-xs py-2`}
              />

              {tagSearchInput.trim() && (
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-accent-blue/20 text-accent-blue hover:bg-accent-blue hover:text-white rounded text-[11px] font-bold transition-colors"
                >
                  Add
                </button>
              )}
            </div>

            {/* Smart Tag Recommendations Dropdown */}
            {isTagDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#0f141c] border border-border shadow-2xl rounded-xl p-2 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/40 mb-1">
                  <span>
                    {tagSearchInput.trim().length >= 3
                      ? `Matching Tags (${matchingTags.length})`
                      : "Recommended Tags (Recently Used)"}
                  </span>
                  {tagSearchInput.trim().length < 3 && (
                    <span className="text-muted/70 font-normal lowercase">Type 3+ chars to search</span>
                  )}
                </div>

                {matchingTags.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted">
                    No matching tags found. Press <kbd className="bg-header px-1.5 py-0.5 rounded text-[10px]">Enter</kbd> to add &ldquo;{tagSearchInput}&rdquo; as a custom tag.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {matchingTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            toggleTag(tag);
                            setTagSearchInput("");
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                            isSelected
                              ? "bg-accent-blue/15 text-accent-blue font-semibold"
                              : "text-foreground hover:bg-header/50"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Tag size={12} className={isSelected ? "text-accent-blue" : "text-muted"} />
                            {tag}
                          </span>
                          {isSelected && <Check size={13} className="text-accent-blue" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
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
