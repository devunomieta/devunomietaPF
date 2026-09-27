"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Send,
  Users,
  Smile,
  Image as ImageIcon,
  Link as LinkIcon,
  Bold,
  Italic,
  Underline,
  List,
  Heading2,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Tag,
  Eye,
  Code,
  Search,
  Check,
  X,
} from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { sendSingleEmail, createBulkCampaign, previewAudienceCount, uploadCampaignImage } from "../actions";
import { analyzeEmailSpam, type SpamAnalysis } from "@/lib/crm/emailSpamScore";
import { SUPPORTED_PERSONALIZATION_VARIABLES } from "@/lib/crm/personalization";

type PrefillRecipient = { id: string; name: string; email: string | null; clientId: string | null; leadId: string | null };

const COMMON_EMOJIS = [
  "👋", "🚀", "✨", "🔥", "💡", "🎯", "🎉", "🤝", "📈", "💼", "⭐", "📢", "💬", "❤️", "⚡", "📩",
];

export function NewCampaignForm({
  stages,
  availableTags = [],
  prefillRecipient,
}: {
  stages: CrmJourneyStage[];
  availableTags?: string[];
  prefillRecipient: PrefillRecipient | null;
}) {
  const router = useRouter();
  const { toast } = useCrmFeedback();
  const [mode, setMode] = useState<"single" | "bulk">(prefillRecipient ? "single" : "bulk");
  const [segment, setSegment] = useState<"clients" | "leads" | "all">("leads");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stageKey, setStageKey] = useState("");
  const [loading, setLoading] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState(
    "<p>Hi {{first_name}},</p><p><br></p><p>We are reaching out to share a quick update...</p>"
  );

  // UI state for popovers & editor
  const [showEmojiSubject, setShowEmojiSubject] = useState(false);
  const [showEmojiBody, setShowEmojiBody] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [viewSource, setViewSource] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Spam analysis state
  const [spamAnalysis, setSpamAnalysis] = useState<SpamAnalysis | null>(null);
  const [showSpamDetails, setShowSpamDetails] = useState(false);

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Sync editor initial HTML once
  useEffect(() => {
    if (editorRef.current && !viewSource) {
      editorRef.current.innerHTML = bodyHtml;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewSource]);

  // Recalculate audience on changes
  useEffect(() => {
    if (mode !== "bulk") return;
    const timeout = setTimeout(async () => {
      const result = await previewAudienceCount({
        segment,
        tags: selectedTags,
        stageKey,
      });
      setAudienceCount(result.count);
    }, 250);
    return () => clearTimeout(timeout);
  }, [mode, segment, selectedTags, stageKey]);

  // Real-time spam checker with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      const analysis = analyzeEmailSpam({ subject, html: bodyHtml });
      setSpamAnalysis(analysis);
    }, 350);
    return () => clearTimeout(timer);
  }, [subject, bodyHtml]);

  // Tag helper
  const [tagSearchInput, setTagSearchInput] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

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
  // When input has < 3 chars, show at least 5 recommendations (most recently used)
  const matchingTags = tagSearchInput.trim().length >= 3
    ? availableTags.filter((t) =>
        t.toLowerCase().includes(tagSearchInput.trim().toLowerCase())
      )
    : availableTags.slice(0, 5);

  // Formatting helpers
  function executeCommand(command: string, value: string | undefined = undefined) {
    if (viewSource) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  }

  function insertEmojiIntoSubject(emoji: string) {
    setSubject((prev) => prev + emoji);
    setShowEmojiSubject(false);
  }

  function insertEmojiIntoBody(emoji: string) {
    if (viewSource) {
      setBodyHtml((prev) => prev + emoji);
    } else {
      executeCommand("insertText", emoji);
    }
    setShowEmojiBody(false);
  }

  function insertVariable(tag: string) {
    if (viewSource) {
      setBodyHtml((prev) => prev + tag);
    } else {
      executeCommand("insertText", tag);
    }
    setShowTokens(false);
  }

  function handleInsertLink() {
    const url = prompt("Enter hyperlink URL (e.g. https://example.com):");
    if (!url) return;
    executeCommand("createLink", url.trim());
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const fd = new FormData();
    fd.append("file", file);

    const res = await uploadCampaignImage(fd);
    setUploadingImage(false);

    if ("success" in res && res.url) {
      if (viewSource) {
        setBodyHtml((prev) => prev + `\n<img src="${res.url}" alt="Campaign Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0;" />\n`);
      } else {
        executeCommand("insertHTML", `<img src="${res.url}" alt="Campaign Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0;" />`);
      }
      toast("Image uploaded and embedded into email!");
    } else {
      toast("error" in res ? res.error : "Failed to upload image");
    }

    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!subject.trim()) {
      toast("Please provide an email subject.");
      return;
    }
    if (!bodyHtml.trim() || bodyHtml === "<p><br></p>") {
      toast("Please provide email body content.");
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("subject", subject);
    formData.set("html", bodyHtml);
    formData.set("segment", segment);
    formData.set("tags", selectedTags.join(","));
    formData.set("stageKey", stageKey);

    const result = mode === "single" ? await sendSingleEmail(formData) : await createBulkCampaign(formData);
    setLoading(false);
    if ("success" in result) {
      const warning = (result as { warning?: string }).warning;
      if (warning) toast(warning);
      router.push("/crm/campaigns");
    } else {
      toast(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-header/20 border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-5">
      {/* Mode Selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            mode === "single"
              ? "bg-accent-blue text-white border-accent-blue shadow-sm shadow-accent-blue/30"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          Single send
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            mode === "bulk"
              ? "bg-accent-blue text-white border-accent-blue shadow-sm shadow-accent-blue/30"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          Bulk campaign
        </button>
      </div>

      {mode === "single" ? (
        <>
          <input type="hidden" name="clientId" value={prefillRecipient?.clientId || ""} />
          <input type="hidden" name="leadId" value={prefillRecipient?.leadId || ""} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={crmLabelClass} htmlFor="email">
                Recipient email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={prefillRecipient?.email || ""}
                className={crmInputClass}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label className={crmLabelClass} htmlFor="recipientName">
                Recipient name
              </label>
              <input
                id="recipientName"
                name="recipientName"
                defaultValue={prefillRecipient?.name || ""}
                className={crmInputClass}
                placeholder="Jane Doe"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 bg-background/50 border border-border/80 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={crmLabelClass} htmlFor="segment">
                Target Audience
              </label>
              <select
                id="segment"
                name="segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value as "clients" | "leads" | "all")}
                className={crmInputClass}
              >
                <option value="leads">Leads</option>
                <option value="clients">Clients</option>
                <option value="all">ALL (Leads & Clients combined)</option>
              </select>
            </div>

            {segment === "leads" && (
              <div>
                <label className={crmLabelClass} htmlFor="stageKey">
                  Stage Filter (optional)
                </label>
                <select
                  id="stageKey"
                  name="stageKey"
                  value={stageKey}
                  onChange={(e) => setStageKey(e.target.value)}
                  className={crmInputClass}
                >
                  <option value="">Any stage</option>
                  {stages.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Modern Searchable Multi-Select Tag Input */}
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

            {/* Selected Tags Chips (when any selected) */}
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
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors text-left ${
                            isSelected
                              ? "bg-accent-blue/15 text-accent-blue font-semibold"
                              : "hover:bg-white/5 text-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Tag size={12} className={isSelected ? "text-accent-blue" : "text-muted"} />
                            <span className="truncate">{tag}</span>
                          </span>
                          {isSelected && <Check size={14} className="text-accent-blue shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audience Counter Banner */}
          <div className="flex items-center justify-between gap-3 text-xs bg-header/40 border border-border rounded-lg p-3">
            <div className="flex items-center gap-2 text-foreground">
              <Users size={16} className="text-accent-blue" />
              <span>
                {audienceCount === null ? (
                  <span className="flex items-center gap-1.5 text-muted">
                    <Loader2 size={12} className="animate-spin" /> Calculating audience…
                  </span>
                ) : (
                  <>
                    <strong className="text-accent-blue text-sm font-semibold">{audienceCount}</strong> recipient(s) will receive this email.
                  </>
                )}
              </span>
            </div>
            {segment === "all" && (
              <span className="text-[10px] text-muted uppercase tracking-wider font-semibold bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded">
                Global Send
              </span>
            )}
          </div>
        </div>
      )}

      {/* Subject Line with Emojis */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className={crmLabelClass} htmlFor="subject">
            Subject *
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiSubject(!showEmojiSubject)}
              className="text-xs text-muted hover:text-foreground flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
              title="Add emoji to subject"
            >
              <Smile size={13} className="text-yellow-400" /> Emojis
            </button>
            {showEmojiSubject && (
              <div className="absolute right-0 top-7 z-30 bg-header border border-border shadow-xl rounded-xl p-2 grid grid-cols-8 gap-1.5 w-60">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmojiIntoSubject(emoji)}
                    className="text-base p-1 hover:bg-white/10 rounded text-center transition-all hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <input
          id="subject"
          name="subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Exciting updates for {{first_name}} 🚀"
          className={crmInputClass}
        />
      </div>

      {/* Rich Text Editor and Tools */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <label className={crmLabelClass} style={{ marginBottom: 0 }}>
            Message Content *
          </label>

          {/* Editor Action Bar */}
          <div className="flex flex-wrap items-center gap-1">
            {/* Rich text formatting buttons */}
            {!viewSource && (
              <div className="flex items-center gap-0.5 bg-header/40 border border-border/70 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => executeCommand("bold")}
                  className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-foreground"
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("italic")}
                  className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-foreground"
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("underline")}
                  className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-foreground"
                  title="Underline"
                >
                  <Underline size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("formatBlock", "<h2>")}
                  className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-foreground"
                  title="Heading 2"
                >
                  <Heading2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand("insertUnorderedList")}
                  className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-foreground"
                  title="Bullet list"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleInsertLink}
                  className="p-1.5 rounded hover:bg-white/10 text-muted hover:text-foreground"
                  title="Embed Hyperlink"
                >
                  <LinkIcon size={13} />
                </button>
              </div>
            )}

            {/* Image upload button */}
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingImage}
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 bg-header/40 border border-border rounded-lg text-xs text-muted hover:text-foreground hover:bg-white/5 transition-all"
              title="Upload and embed image"
            >
              {uploadingImage ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
              <span>{uploadingImage ? "Uploading…" : "Add Image"}</span>
            </button>

            {/* Emoji body button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiBody(!showEmojiBody)}
                className="flex items-center gap-1 px-2 py-1 bg-header/40 border border-border rounded-lg text-xs text-muted hover:text-foreground hover:bg-white/5"
                title="Insert emoji into body"
              >
                <Smile size={12} className="text-yellow-400" />
              </button>
              {showEmojiBody && (
                <div className="absolute right-0 top-7 z-30 bg-header border border-border shadow-xl rounded-xl p-2 grid grid-cols-8 gap-1.5 w-60">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmojiIntoBody(emoji)}
                      className="text-base p-1 hover:bg-white/10 rounded text-center transition-all hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Personalization dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTokens(!showTokens)}
                className="flex items-center gap-1 px-2.5 py-1 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-lg text-xs font-semibold hover:bg-accent-blue/20 transition-colors"
                title="Insert personalization variable"
              >
                <Sparkles size={12} />
                <span>Personalize</span>
                <ChevronDown size={11} />
              </button>
              {showTokens && (
                <div className="absolute right-0 top-8 z-30 bg-header border border-border shadow-xl rounded-xl p-2 min-w-[200px] flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider px-2 py-1">
                    Insert Variable
                  </span>
                  {SUPPORTED_PERSONALIZATION_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      className="flex items-center justify-between gap-3 text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/5 text-foreground transition-colors"
                    >
                      <span className="font-medium">{v.label}</span>
                      <code className="text-[10px] text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded">
                        {v.tag}
                      </code>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle Source Code / Preview */}
            <button
              type="button"
              onClick={() => {
                if (viewSource && editorRef.current) {
                  editorRef.current.innerHTML = bodyHtml;
                }
                setViewSource(!viewSource);
              }}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                viewSource ? "bg-accent-blue text-white border-accent-blue" : "border-border text-muted hover:text-foreground"
              }`}
              title={viewSource ? "Switch to Visual Editor" : "View raw HTML source"}
            >
              <Code size={13} />
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                showPreview ? "bg-accent-blue text-white border-accent-blue" : "border-border text-muted hover:text-foreground"
              }`}
              title="Preview email output"
            >
              <Eye size={13} />
            </button>
          </div>
        </div>

        {/* Visual Content Editable vs HTML Source */}
        {showPreview ? (
          <div className="bg-white text-zinc-900 border border-border rounded-xl p-6 min-h-[220px] max-h-[400px] overflow-y-auto font-sans leading-relaxed shadow-inner">
            <div className="border-b border-zinc-200 pb-2 mb-4 text-xs text-zinc-500">
              <strong>Preview:</strong> Subject: {subject.replace(/\{\{\s*first_name\s*\}\}/gi, "Jane") || "(No subject)"}
            </div>
            <div
              dangerouslySetInnerHTML={{
                __html: bodyHtml
                  .replace(/\{\{\s*first_name\s*\}\}/gi, "Jane")
                  .replace(/\{\{\s*name\s*\}\}/gi, "Jane Doe")
                  .replace(/\{\{\s*company\s*\}\}/gi, "Acme Corp")
                  .replace(/\{\{\s*email\s*\}\}/gi, "jane@example.com"),
              }}
            />
          </div>
        ) : viewSource ? (
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={10}
            className={`${crmInputClass} font-mono text-xs leading-relaxed`}
            placeholder="<html>...</html>"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={() => {
              if (editorRef.current) {
                setBodyHtml(editorRef.current.innerHTML);
              }
            }}
            className="w-full min-h-[220px] max-h-[450px] overflow-y-auto bg-header/30 border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none focus:border-accent-blue transition-all"
            style={{ minHeight: "220px" }}
          />
        )}

        <div className="flex flex-wrap items-center justify-between text-xs text-muted pt-1">
          <p>
            Supported personalization:{" "}
            <code className="text-accent-blue">{"{{first_name}}"}</code>,{" "}
            <code className="text-accent-blue">{"{{last_name}}"}</code>,{" "}
            <code className="text-accent-blue">{"{{company}}"}</code>,{" "}
            <code className="text-accent-blue">{"{{email}}"}</code>
          </p>
          <span>Rich HTML & links supported</span>
        </div>
      </div>

      {/* Real-time Spam Checker Safety Feedback Widget */}
      {spamAnalysis && (
        <div
          className={`border rounded-xl p-4 transition-all ${
            spamAnalysis.verdict === "Safe"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : spamAnalysis.verdict === "Moderate Risk"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {spamAnalysis.verdict === "Safe" ? (
                <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert size={18} className="shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider">
                  Deliverability Safety Score: {spamAnalysis.score} / 100
                </span>
                <span className="ml-2 text-xs font-medium">({spamAnalysis.verdict})</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSpamDetails(!showSpamDetails)}
              className="text-xs font-medium underline opacity-80 hover:opacity-100"
            >
              {showSpamDetails ? "Hide feedback" : "Spam feedback"}
            </button>
          </div>

          {showSpamDetails && (
            <div className="mt-3 pt-3 border-t border-current/20 space-y-1.5 text-xs">
              {spamAnalysis.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="shrink-0 font-bold">•</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
        <button type="button" onClick={() => router.back()} className={crmSecondaryBtnClass}>
          Cancel
        </button>
        <button type="submit" disabled={loading} className={crmPrimaryBtnClass}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {mode === "single" ? "Send email" : "Launch campaign"}
        </button>
      </div>
    </form>
  );
}
