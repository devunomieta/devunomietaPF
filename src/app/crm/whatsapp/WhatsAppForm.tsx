"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Users, Shuffle, Sparkles, ShieldCheck, ShieldAlert, Tag, X, Search, Check, Scissors, Link as LinkIcon, ExternalLink, AlertCircle } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { sendSingleWhatsApp, createBulkWhatsApp, previewWhatsAppAudienceCount, previewCustomWhatsAppAudience, lookupContactByPhone } from "./actions";
import { hasSpintax, generateVariations } from "@/lib/crm/spintax";
import {
  createShortLink,
  checkSlugAvailability,
  generateSuggestedSlug,
} from "@/lib/crm/shortLinkActions";

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
  initialMode?: "single" | "bulk" | "custom" | null;
}) {
  const router = useRouter();
  const { toast, canPerform } = useCrmFeedback();
  const [mode, setMode] = useState<"single" | "bulk" | "custom">(
    initialMode || (prefillRecipient ? "single" : "bulk")
  );
  const [segment, setSegment] = useState<"clients" | "leads" | "all">("leads");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stageKey, setStageKey] = useState("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom Batch Paste State
  const [customPhonesRaw, setCustomPhonesRaw] = useState<string>("");
  const [customAnalysis, setCustomAnalysis] = useState<{
    validCount: number;
    matchedCount: number;
    suppressedCount: number;
    samples: Array<{ phone: string; name?: string; matched: boolean; type?: string; error?: string }>;
  } | null>(null);
  const [checkingCustom, setCheckingCustom] = useState(false);

  // Single mode phone & contact lookup state
  const [singlePhone, setSinglePhone] = useState(prefillRecipient?.phone || "");
  const [contactName, setContactName] = useState(prefillRecipient?.name || "");
  const [company, setCompany] = useState("");
  const [resolvedEntity, setResolvedEntity] = useState<{
    found: boolean;
    name?: string;
    company?: string;
    type?: string;
    clientId?: string | null;
    leadId?: string | null;
  } | null>(null);
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);

  // Link Shortener Modal State
  const [showShortenModal, setShowShortenModal] = useState(false);
  const [shortenUrl, setShortenUrl] = useState("https://");
  const [shortenSlug, setShortenSlug] = useState("");
  const [shortenTitle, setShortenTitle] = useState("");
  const [shortenChecking, setShortenChecking] = useState(false);
  const [shortenSlugStatus, setShortenSlugStatus] = useState<{ available: boolean; error?: string } | null>(null);
  const [creatingShortLink, setCreatingShortLink] = useState(false);

  // Auto-generate suggested slug when opening modal
  useEffect(() => {
    if (showShortenModal && !shortenSlug) {
      generateSuggestedSlug("wa").then((slug) => {
        setShortenSlug(slug);
        setShortenSlugStatus({ available: true });
      });
    }
  }, [showShortenModal, shortenSlug]);

  // Debounced check for shortenSlug
  useEffect(() => {
    if (!showShortenModal || !shortenSlug) {
      setShortenSlugStatus(null);
      return;
    }
    setShortenChecking(true);
    const timer = setTimeout(async () => {
      const res = await checkSlugAvailability(shortenSlug);
      setShortenSlugStatus(res);
      setShortenChecking(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [showShortenModal, shortenSlug]);

  const handleInsertShortLinkIntoMessage = async () => {
    if (!shortenUrl || shortenUrl === "https://") return;

    setCreatingShortLink(true);
    const res = await createShortLink({
      originalUrl: shortenUrl,
      customSlug: shortenSlug || undefined,
      title: shortenTitle || undefined,
      channel: "whatsapp",
    });
    setCreatingShortLink(false);

    if ("shortUrl" in res) {
      setMessage((prev) => `${prev.trim()} ${res.shortUrl} `);
      setShowShortenModal(false);
      setShortenUrl("https://");
      setShortenSlug("");
      setShortenTitle("");
      toast("Short link inserted into message!", "success");
    } else {
      toast(res.error || "Failed to create short link.", "error");
    }
  };

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
  }

  function handleSelectAllTags() {
    const tagsToAdd = tagSearchInput.trim()
      ? availableTags.filter((t) => t.toLowerCase().includes(tagSearchInput.trim().toLowerCase()))
      : availableTags;

    setSelectedTags((prev) => {
      const set = new Set([...prev, ...tagsToAdd]);
      return Array.from(set);
    });
  }

  function handleAddCustomTag() {
    const trimmed = tagSearchInput.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setTagSearchInput("");
  }

  // When input is typed, filter from all available tags; when empty, bring out all tags for complete multi-selection
  const matchingTags = tagSearchInput.trim()
    ? availableTags.filter((t) =>
        t.toLowerCase().includes(tagSearchInput.trim().toLowerCase())
      )
    : availableTags;

  // Recalculate audience on changes for bulk mode
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

  // Recalculate custom audience validation & CRM match preview on paste/edit
  useEffect(() => {
    if (mode !== "custom") return;
    if (!customPhonesRaw.trim()) {
      setCustomAnalysis(null);
      return;
    }
    setCheckingCustom(true);
    const timeout = setTimeout(async () => {
      try {
        const details = await previewCustomWhatsAppAudience(customPhonesRaw);
        setCustomAnalysis(details);
      } catch (err) {
        console.error("Failed to preview custom WhatsApp audience:", err);
      } finally {
        setCheckingCustom(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [mode, customPhonesRaw]);

  // Automatically lookup phone number in CRM when typing in Single mode
  useEffect(() => {
    if (mode !== "single") return;
    const cleanDigits = singlePhone.replace(/\D/g, "");
    if (cleanDigits.length < 8) {
      setResolvedEntity(null);
      return;
    }

    setIsLookingUpPhone(true);
    const timer = setTimeout(async () => {
      try {
        const lookup = await lookupContactByPhone(singlePhone);
        setResolvedEntity(lookup);
        if (lookup.found) {
          if (lookup.name) setContactName(lookup.name);
          if (lookup.company) setCompany(lookup.company);
        }
      } catch (err) {
        console.error("Failed to lookup contact by phone:", err);
      } finally {
        setIsLookingUpPhone(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [mode, singlePhone]);

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
    formData.set("sendMode", mode);
    formData.set("segment", segment);
    formData.set("tags", selectedTags.join(","));
    formData.set("stageKey", stageKey);
    formData.set("message", message);
    if (mode === "custom") {
      formData.set("customPhones", customPhonesRaw);
    }

    const result = mode === "single" ? await sendSingleWhatsApp(formData) : await createBulkWhatsApp(formData);
    setLoading(false);
    if ("success" in result) {
      const warning = (result as { warning?: string }).warning;
      toast(warning || "WhatsApp queued for processing.", warning ? "error" : "success");
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
          Audience Filter
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            mode === "custom" ? "bg-accent-blue text-white border-accent-blue shadow-sm shadow-accent-blue/30" : "border-border text-muted hover:text-foreground"
          }`}
        >
          Custom Batch (Paste)
        </button>
      </div>

      {mode === "single" ? (
        <div className="flex flex-col gap-4 bg-background/50 border border-border/80 rounded-xl p-4 animate-in fade-in duration-200">
          <input type="hidden" name="clientId" value={resolvedEntity?.clientId || prefillRecipient?.clientId || ""} />
          <input type="hidden" name="leadId" value={resolvedEntity?.leadId || prefillRecipient?.leadId || ""} />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={crmLabelClass} htmlFor="phone" style={{ marginBottom: 0 }}>
                Phone number *
              </label>
              {isLookingUpPhone ? (
                <span className="text-[11px] text-muted flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin text-accent-blue" />
                  Checking CRM records…
                </span>
              ) : resolvedEntity?.found ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <Check size={11} />
                  Matched existing {resolvedEntity.type}: {resolvedEntity.name}
                </span>
              ) : singlePhone.replace(/\D/g, "").length >= 8 ? (
                <span className="text-[11px] text-amber-400/90 font-medium">
                  • New contact (will be saved to CRM)
                </span>
              ) : null}
            </div>
            <input
              id="phone"
              name="phone"
              required
              value={singlePhone}
              onChange={(e) => setSinglePhone(e.target.value)}
              className={crmInputClass}
              placeholder="+234..."
            />
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className={crmLabelClass} htmlFor="contactName">
                Contact Name {!resolvedEntity?.found && <span className="text-accent-blue">*</span>}
              </label>
              <input
                id="contactName"
                name="contactName"
                required={!resolvedEntity?.found}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={resolvedEntity?.found ? resolvedEntity.name || "Full Name" : "e.g. John Doe"}
                className={crmInputClass}
              />
              <span className="text-[10px] text-muted mt-1 block">
                {resolvedEntity?.found
                  ? "Auto-fetched from existing CRM contact record"
                  : "Required for new numbers to personalize {{first_name}} and save to CRM"}
              </span>
            </div>

            <div>
              <label className={crmLabelClass} htmlFor="company">
                Company / Organization <span className="text-muted font-normal">(optional)</span>
              </label>
              <input
                id="company"
                name="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={resolvedEntity?.company || "e.g. Acme Corp"}
                className={crmInputClass}
              />
              <span className="text-[10px] text-muted mt-1 block">
                {resolvedEntity?.company
                  ? "Auto-fetched from CRM account profile"
                  : "Used for {{company}} personalization tag"}
              </span>
            </div>
          </div>
        </div>
      ) : mode === "custom" ? (
        /* Custom Batch Paste UI */
        <div className="flex flex-col gap-4 bg-background/50 border border-border/80 rounded-xl p-4 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={crmLabelClass} htmlFor="customPhones" style={{ marginBottom: 0 }}>
                Batch Paste WhatsApp Numbers *
              </label>
              <span className="text-[11px] text-muted">
                Separated by newlines, commas, or semicolons (supports &quot;Name &lt;Phone&gt;&quot; or plain numbers)
              </span>
            </div>
            <textarea
              id="customPhones"
              name="customPhones"
              rows={4}
              value={customPhonesRaw}
              onChange={(e) => setCustomPhonesRaw(e.target.value)}
              placeholder="e.g. 0803 306 1252, John Doe&#10;+234 816 739 6380&#10;Dr. Prestige <08033467911>"
              className={`${crmInputClass} font-mono text-xs leading-relaxed resize-y`}
            />
          </div>

          {/* Real-time Validation & CRM Match Breakdown */}
          <div className="bg-header/40 border border-border rounded-lg p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <Users size={15} className="text-accent-blue" />
                <span>
                  {checkingCustom ? (
                    <span className="flex items-center gap-1.5 text-muted">
                      <Loader2 size={12} className="animate-spin" /> Resolving numbers & CRM contacts…
                    </span>
                  ) : !customAnalysis ? (
                    <span className="text-muted">Paste phone numbers above to calculate audience and match CRM records.</span>
                  ) : (
                    <>
                      <strong className="text-accent-blue text-sm font-semibold">{customAnalysis.validCount - customAnalysis.suppressedCount}</strong> contact(s) ready to message.
                    </>
                  )}
                </span>
              </div>

              {customAnalysis && customAnalysis.validCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Check size={11} />
                    {customAnalysis.matchedCount} matched in CRM
                  </span>
                  {customAnalysis.suppressedCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      <ShieldAlert size={11} />
                      {customAnalysis.suppressedCount} opted-out (suppressed)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Note & Sample Resolved Entities Chips */}
            {customAnalysis && customAnalysis.samples.length > 0 && (
              <div className="pt-2 border-t border-border/50 text-[11px] text-muted flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground/80">Recipients Preview & CRM Linking:</span>
                  <span className="text-[10px] text-muted/80">Showing first {customAnalysis.samples.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {customAnalysis.samples.map((s, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${
                        s.error
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : s.matched
                            ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue font-medium"
                            : "bg-header/60 border-border text-foreground/75"
                      }`}
                      title={s.error || (s.matched ? `Linked to ${s.type}: ${s.name || s.phone}` : "External number")}
                    >
                      {s.matched && <Check size={10} className="text-accent-blue" />}
                      <span>{s.name ? `${s.name} (${s.phone})` : s.phone}</span>
                      {s.type && (
                        <span className="text-[9px] uppercase px-1 rounded bg-accent-blue/20 text-accent-blue font-semibold">
                          {s.type}
                        </span>
                      )}
                      {s.error && <span className="text-[9px] text-red-400 font-semibold">({s.error})</span>}
                    </span>
                  ))}
                  {customAnalysis.validCount > customAnalysis.samples.length && (
                    <span className="text-[11px] text-muted self-center ml-1">
                      +{customAnalysis.validCount - customAnalysis.samples.length} more
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-400/90 mt-1">
                  ✓ Numbers are automatically formatted to international E.164 (e.g. 0803... → 234803...). Matching Leads/Clients will show messages in their activity timeline.
                </p>
              </div>
            )}
          </div>
        </div>
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
              <div className="flex items-center gap-2">
                {availableTags.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllTags}
                    className="text-[11px] font-semibold text-accent-blue hover:text-accent-blue/80 hover:underline px-1.5 py-0.5 rounded bg-accent-blue/10 border border-accent-blue/20"
                    title="Select all tags matching current view"
                  >
                    Select ALL ({availableTags.length})
                  </button>
                )}
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
                    ? `Search across all ${availableTags.length} tags or type custom...`
                    : `Search or browse all ${availableTags.length} tags (e.g. VIP, Medical, Lead)...`
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
                    if (matchingTags.length > 0 && tagSearchInput.trim().length >= 2) {
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
                  Add Custom
                </button>
              )}
            </div>

            {/* Smart Tag Multi-Select Dropdown with ALL button */}
            {isTagDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#0f141c] border border-border shadow-2xl rounded-xl p-2 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/40 mb-1">
                  <span>
                    {tagSearchInput.trim()
                      ? `Matching Tags (${matchingTags.length})`
                      : `All Available Tags (${matchingTags.length})`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTags}
                      className="text-accent-blue hover:underline lowercase font-semibold"
                    >
                      + select all ({matchingTags.length})
                    </button>
                    {selectedTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTags([])}
                        className="text-red-400 hover:underline lowercase font-normal"
                      >
                        clear
                      </button>
                    )}
                  </div>
                </div>

                {matchingTags.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted">
                    No matching tags found. Press <kbd className="bg-header px-1.5 py-0.5 rounded text-[10px]">Enter</kbd> or click <strong>Add Custom</strong> to add &ldquo;{tagSearchInput}&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {matchingTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors text-left ${
                            isSelected
                              ? "bg-accent-blue/15 text-accent-blue font-semibold"
                              : "text-foreground hover:bg-header/50"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-border text-accent-blue focus:ring-0 cursor-pointer pointer-events-none"
                            />
                            <Tag size={12} className={isSelected ? "text-accent-blue" : "text-muted"} />
                            <span className="truncate">{tag}</span>
                          </span>
                          {isSelected && <Check size={13} className="text-accent-blue shrink-0 ml-2" />}
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShortenModal(true)}
              className="text-[11px] text-accent-blue hover:bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/30 inline-flex items-center gap-1 font-semibold transition"
            >
              <Scissors size={11} />
              Shorten link
            </button>
            <button
              type="button"
              onClick={() => setShowSpintaxGuide(!showSpintaxGuide)}
              className="text-[11px] text-accent-blue hover:underline inline-flex items-center gap-1 font-medium"
            >
              <Sparkles size={12} />
              Spintax guide {showSpintaxGuide ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {showSpintaxGuide && (
          <div className="mb-3 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-xl text-xs text-foreground/90 flex flex-col gap-1.5">
            <p className="font-semibold text-accent-blue">How to use Spin Syntax (Spintax):</p>
            <p className="text-muted leading-relaxed">
              Wrap variations in curly brackets separated by vertical pipes: <code>{"{Option 1|Option 2|Option 3}"}</code>. Each sent message randomly picks one variation so messages aren&apos;t identical.
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

          <button
            type="button"
            onClick={handleShufflePreview}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-header/40 hover:bg-header/60 text-foreground border border-border transition-colors self-start sm:self-auto"
          >
            <Shuffle size={13} className="text-accent-blue" />
            Shuffle Preview
          </button>
        </div>
      </div>

      {/* Live Variations Preview */}
      {previewVariations.length > 0 && (
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

      {!canPerform("whatsapp_send") && (
        <div className="p-3 bg-header/40 border border-border/80 rounded-xl text-xs text-muted flex items-center gap-2">
          <ShieldAlert size={14} className="text-yellow-400 shrink-0" />
          <span>Your team account does not have permission to send WhatsApp messages.</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || disabled || !canPerform("whatsapp_send")}
        className={`${crmPrimaryBtnClass} self-start mt-1 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        {mode === "single" ? "Send single message" : mode === "custom" ? "Send custom batch" : "Send audience batch"}
      </button>

      {/* Branded Link Shortener Modal */}
      {showShortenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="bg-header border border-border rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Scissors size={16} className="text-accent-blue" />
                Branded Link Shortener
              </div>
              <button
                type="button"
                onClick={() => setShowShortenModal(false)}
                className="text-muted hover:text-foreground text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={crmLabelClass}>Destination / Target URL</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={shortenUrl}
                  onChange={(e) => setShortenUrl(e.target.value)}
                  className={crmInputClass}
                  autoFocus
                />
                <p className="text-[11px] text-muted mt-1">
                  Google Drive, Calendly, PDF, presentation, or any target link.
                </p>
              </div>

              <div>
                <label className={crmLabelClass}>Custom Short URL (Editable Real-Time)</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted font-mono bg-background/60 px-2 py-2 rounded-lg border border-border select-none">
                    devunomieta.xyz/
                  </span>
                  <input
                    type="text"
                    placeholder="doc002"
                    value={shortenSlug}
                    onChange={(e) => setShortenSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                    className={`${crmInputClass} font-mono`}
                  />
                </div>
                {/* Real-time slug status indicator */}
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                  {shortenChecking ? (
                    <span className="text-muted flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin" /> Checking availability...
                    </span>
                  ) : shortenSlugStatus?.available ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check size={11} /> devunomieta.xyz/{shortenSlug} is available!
                    </span>
                  ) : shortenSlugStatus?.error ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle size={11} /> {shortenSlugStatus.error}
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <label className={crmLabelClass}>Optional Title / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Proposal Document"
                  value={shortenTitle}
                  onChange={(e) => setShortenTitle(e.target.value)}
                  className={crmInputClass}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowShortenModal(false)}
                className="px-3 py-1.5 text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingShortLink || !shortenUrl || shortenUrl === "https://" || !shortenSlugStatus?.available}
                onClick={handleInsertShortLinkIntoMessage}
                className={`${crmPrimaryBtnClass} disabled:opacity-50`}
              >
                {creatingShortLink ? <Loader2 size={13} className="animate-spin" /> : <LinkIcon size={13} />}
                Insert Short Link
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
