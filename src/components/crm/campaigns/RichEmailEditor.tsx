"use client";

import { useRef, useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Minus,
  Sparkles,
  Image as ImageIcon,
  Smile,
  MousePointerClick,
  Code,
  Undo,
  Redo,
  Loader2,
  Paperclip,
  FileText,
  Scissors,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { SUPPORTED_PERSONALIZATION_VARIABLES } from "@/lib/crm/personalization";
import { uploadCampaignImage, uploadCampaignDocument } from "@/app/crm/campaigns/actions";
import {
  createShortLink,
  checkSlugAvailability,
  generateSuggestedSlug,
} from "@/lib/crm/shortLinkActions";

type RichEmailEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const COMMON_EMOJIS = [
  "👋", "🚀", "✨", "🔥", "💡", "🎯", "🎉", "🤝", "📈", "💼", "⭐", "📢", "💬", "❤️", "⚡", "📩",
];

export function RichEmailEditor({ value, onChange, placeholder }: RichEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(value);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Floating Selection Bubble Menu
  const [floatingMenu, setFloatingMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  // Popups & dialogs
  const [showPersonalizeMenu, setShowPersonalizeMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showButtonModal, setShowButtonModal] = useState(false);

  // Link & Button Modal States
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkText, setLinkText] = useState("");
  const [enableShortLink, setEnableShortLink] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{ available: boolean; error?: string } | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);

  const [buttonText, setButtonText] = useState("Book Consultation");
  const [buttonUrl, setButtonUrl] = useState("https://");
  const [buttonEnableShort, setButtonEnableShort] = useState(false);
  const [buttonCustomSlug, setButtonCustomSlug] = useState("");
  const [buttonSlugStatus, setButtonSlugStatus] = useState<{ available: boolean; error?: string } | null>(null);

  // Keep internal HTML updated when value changes externally (e.g. template or draft loading)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || "";
      }
    }
    setRawHtml(value);
  }, [value]);

  // Execute standard rich document command
  const exec = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    triggerChange();
    updateFloatingBubble();
  };

  const triggerChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setRawHtml(html);
    }
  };

  // Detect selection for floating bubble toolbar
  const updateFloatingBubble = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editorRef.current) {
      setFloatingMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    if (!editorRef.current.contains(selection.anchorNode)) {
      setFloatingMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    // Position above the selected text
    setFloatingMenu({
      visible: true,
      x: Math.max(10, rect.left - editorRect.left + rect.width / 2 - 120),
      y: Math.max(10, rect.top - editorRect.top - 46),
    });
  };


  // Auto-generate slug when toggling short link on in Link Modal
  useEffect(() => {
    if (enableShortLink && !customSlug) {
      generateSuggestedSlug("doc").then((slug) => {
        setCustomSlug(slug);
        setSlugStatus({ available: true });
      });
    }
  }, [enableShortLink, customSlug]);

  // Debounced check for customSlug in Link Modal
  useEffect(() => {
    if (!enableShortLink || !customSlug) {
      setSlugStatus(null);
      return;
    }
    setSlugChecking(true);
    const timer = setTimeout(async () => {
      const res = await checkSlugAvailability(customSlug);
      setSlugStatus(res);
      setSlugChecking(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [enableShortLink, customSlug]);

  // Auto-generate slug when toggling short link on in Button Modal
  useEffect(() => {
    if (buttonEnableShort && !buttonCustomSlug) {
      generateSuggestedSlug("btn").then((slug) => {
        setButtonCustomSlug(slug);
        setButtonSlugStatus({ available: true });
      });
    }
  }, [buttonEnableShort, buttonCustomSlug]);

  // Debounced check for buttonCustomSlug in Button Modal
  useEffect(() => {
    if (!buttonEnableShort || !buttonCustomSlug) {
      setButtonSlugStatus(null);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await checkSlugAvailability(buttonCustomSlug);
      setButtonSlugStatus(res);
    }, 300);
    return () => clearTimeout(timer);
  }, [buttonEnableShort, buttonCustomSlug]);

  // Insert a Call-To-Action (CTA) email button block
  const insertCtaButton = async () => {
    if (!buttonText || !buttonUrl) return;

    let targetUrl = buttonUrl;

    if (buttonEnableShort) {
      setCreatingLink(true);
      const res = await createShortLink({
        originalUrl: buttonUrl,
        customSlug: buttonCustomSlug || undefined,
        title: buttonText,
        channel: "email",
      });
      setCreatingLink(false);

      if ("shortUrl" in res) {
        targetUrl = res.shortUrl;
      } else {
        alert(res.error || "Failed to create short link.");
        return;
      }
    }

    const buttonHtml = `
      <div style="margin: 24px 0; text-align: center;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${targetUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#2563eb">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${buttonText}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${targetUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);">
          ${buttonText}
        </a>
        <!--<![endif]-->
      </div>
    `;
    exec("insertHTML", buttonHtml);
    setShowButtonModal(false);
  };

  // Image Upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadCampaignImage(formData);
      if ("url" in res) {
        const imgHtml = `
          <div style="margin: 18px 0; text-align: center;">
            <img src="${res.url}" alt="${file.name.replace(/\.[^/.]+$/, "")}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb;" />
          </div>
        `;
        exec("insertHTML", imgHtml);
      } else {
        alert(res.error || "Image upload failed");
      }
    } catch {
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Document Upload handler (DOC, DOCX, PDF, etc.)
  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadCampaignDocument(formData);
      if ("url" in res) {
        // Automatically create a short link for the document download so it is branded
        const cleanName = res.fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase().slice(0, 20);
        const shortRes = await createShortLink({
          originalUrl: res.url,
          customSlug: `doc-${cleanName}`,
          title: res.fileName,
          channel: "email",
        });

        const downloadUrl = "shortUrl" in shortRes ? shortRes.shortUrl : res.url;
        const displaySlug = "slug" in shortRes ? `devunomieta.xyz/${shortRes.slug}` : downloadUrl;

        // Render an elegant, email-client safe document download card
        const docHtml = `
          <div style="margin: 20px 0; padding: 14px 18px; border: 1px solid #334155; border-radius: 10px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="36" valign="middle" style="padding-right: 12px;">
                  <div style="width: 36px; height: 36px; border-radius: 8px; background-color: #1e293b; border: 1px solid #3b82f6; text-align: center; line-height: 36px; font-size: 18px;">
                    📄
                  </div>
                </td>
                <td valign="middle">
                  <div style="font-weight: 600; font-size: 13px; color: #f8fafc; margin-bottom: 2px;">
                    ${res.fileName}
                  </div>
                  <div style="font-size: 11px; color: #94a3b8;">
                    ${res.fileSizeFormatted} · ${res.extension} File · <span style="color: #60a5fa;">${displaySlug}</span>
                  </div>
                </td>
                <td align="right" valign="middle" style="padding-left: 12px;">
                  <a href="${downloadUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 600; white-space: nowrap;">
                    Download ${res.extension}
                  </a>
                </td>
              </tr>
            </table>
          </div>
        `;
        exec("insertHTML", docHtml);
      } else {
        alert(res.error || "Document upload failed");
      }
    } catch {
      alert("Failed to upload document. Please try again.");
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  // Submit Link Modal with optional shortening
  const handleInsertLinkModal = async () => {
    if (!linkUrl || linkUrl === "https://") return;

    let targetUrl = linkUrl;

    if (enableShortLink) {
      setCreatingLink(true);
      const res = await createShortLink({
        originalUrl: linkUrl,
        customSlug: customSlug || undefined,
        title: linkText || undefined,
        channel: "email",
      });
      setCreatingLink(false);

      if ("shortUrl" in res) {
        targetUrl = res.shortUrl;
      } else {
        alert(res.error || "Failed to create short link.");
        return;
      }
    }

    if (linkText) {
      const linkHtml = `<a href="${targetUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">${linkText}</a>`;
      exec("insertHTML", linkHtml);
    } else {
      exec("createLink", targetUrl);
    }

    setShowLinkModal(false);
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col relative">
      {/* Top Fixed Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-header/30 border-b border-border text-xs">
        <div className="flex flex-wrap items-center gap-0.5">
          {/* Text Style */}
          <button
            type="button"
            onClick={() => exec("bold")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec("underline")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Underline (Ctrl+U)"
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec("strikeThrough")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>

          <span className="w-[1px] h-4 bg-border mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => exec("formatBlock", "<h1>")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Heading 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<h2>")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Heading 2"
          >
            <Heading2 size={15} />
          </button>

          <span className="w-[1px] h-4 bg-border mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => exec("insertUnorderedList")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Bulleted List"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec("insertOrderedList")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Numbered List"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<blockquote>")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Quote / Callout"
          >
            <Quote size={15} />
          </button>
          <button
            type="button"
            onClick={() => exec("insertHorizontalRule")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Horizontal Divider"
          >
            <Minus size={15} />
          </button>

          <span className="w-[1px] h-4 bg-border mx-1" />

          {/* Link */}
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Insert Link"
          >
            <LinkIcon size={15} />
          </button>

          {/* CTA Button */}
          <button
            type="button"
            onClick={() => setShowButtonModal(true)}
            className="px-2 py-1 rounded bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue font-medium flex items-center gap-1 transition"
            title="Insert Call To Action Button"
          >
            <MousePointerClick size={14} />
            <span className="text-[11px] hidden sm:inline">CTA Button</span>
          </button>

          {/* Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition flex items-center gap-1"
            title="Upload Image"
          >
            {uploadingImage ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
          </button>

          {/* Document / PDF Upload */}
          <input
            type="file"
            ref={docInputRef}
            onChange={handleDocFileChange}
            accept=".pdf,.doc,.docx,.txt,.rtf,.xlsx,.csv,.pptx"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            disabled={uploadingDoc}
            className="p-1.5 rounded hover:bg-accent-blue/15 text-accent-blue hover:text-accent-blue transition flex items-center gap-1"
            title="Attach Document (PDF, DOC, DOCX, etc.)"
          >
            {uploadingDoc ? <Loader2 size={15} className="animate-spin text-accent-blue" /> : <Paperclip size={15} />}
          </button>

          {/* Emojis */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
              title="Insert Emoji"
            >
              <Smile size={15} />
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-card border border-border rounded-lg shadow-xl p-2 grid grid-cols-4 gap-1.5 w-48">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      exec("insertText", emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1.5 text-base hover:bg-muted/20 rounded transition text-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Personalization Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPersonalizeMenu(!showPersonalizeMenu)}
              className="px-2 py-1 rounded bg-muted/20 hover:bg-muted/30 text-foreground text-[11px] font-medium flex items-center gap-1 transition"
            >
              <Sparkles size={12} className="text-accent-blue" />
              <span>Personalize</span>
            </button>

            {showPersonalizeMenu && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-card border border-border rounded-lg shadow-xl py-1 w-56">
                <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-muted tracking-wider border-b border-border">
                  Insert Merge Token
                </div>
                {SUPPORTED_PERSONALIZATION_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => {
                      exec("insertText", v.tag);
                      setShowPersonalizeMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-muted/20 flex flex-col transition"
                  >
                    <span className="text-xs font-mono font-semibold text-accent-blue">{v.tag}</span>
                    <span className="text-[10px] text-muted">{v.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right tools: Undo, Redo, Source Switcher */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => exec("undo")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Undo"
          >
            <Undo size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec("redo")}
            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition"
            title="Redo"
          >
            <Redo size={14} />
          </button>
          <span className="w-[1px] h-4 bg-border mx-1" />
          <button
            type="button"
            onClick={() => {
              if (isSourceMode) {
                // Return to visual
                if (editorRef.current) {
                  editorRef.current.innerHTML = rawHtml;
                }
                onChange(rawHtml);
              }
              setIsSourceMode(!isSourceMode);
            }}
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition ${
              isSourceMode ? "bg-accent-blue text-white" : "hover:bg-muted/20 text-muted hover:text-foreground"
            }`}
            title="Toggle HTML Source Code"
          >
            <Code size={14} />
            <span className="text-[11px] hidden sm:inline">HTML</span>
          </button>
        </div>
      </div>

      {/* Floating Selection Bubble Toolbar */}
      {floatingMenu.visible && !isSourceMode && (
        <div
          style={{ top: `${floatingMenu.y}px`, left: `${floatingMenu.x}px` }}
          className="absolute z-40 bg-neutral-900 border border-neutral-700 shadow-2xl rounded-lg px-1 py-0.5 flex items-center gap-0.5 text-white animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec("bold");
            }}
            className="p-1.5 rounded hover:bg-neutral-800 transition"
            title="Bold"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec("italic");
            }}
            className="p-1.5 rounded hover:bg-neutral-800 transition"
            title="Italic"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec("underline");
            }}
            className="p-1.5 rounded hover:bg-neutral-800 transition"
            title="Underline"
          >
            <Underline size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowLinkModal(true);
            }}
            className="p-1.5 rounded hover:bg-neutral-800 transition"
            title="Add Link"
          >
            <LinkIcon size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              exec("formatBlock", "<blockquote>");
            }}
            className="p-1.5 rounded hover:bg-neutral-800 transition"
            title="Callout Quote"
          >
            <Quote size={13} />
          </button>
        </div>
      )}

      {/* Editor Surface */}
      <div className="relative min-h-[280px] p-4 flex flex-col">
        {isSourceMode ? (
          <textarea
            value={rawHtml}
            onChange={(e) => {
              setRawHtml(e.target.value);
              onChange(e.target.value);
            }}
            className="w-full h-full min-h-[280px] font-mono text-xs bg-neutral-950 text-neutral-200 p-3 rounded border border-border focus:outline-none resize-y"
            placeholder="Write or paste raw HTML email code here..."
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={triggerChange}
            onSelect={updateFloatingBubble}
            onKeyUp={updateFloatingBubble}
            onMouseUp={updateFloatingBubble}
            className="prose prose-invert max-w-none min-h-[280px] focus:outline-none text-foreground text-sm leading-relaxed"
            style={{ minHeight: "280px" }}
            data-placeholder={placeholder || "Start typing your email message here..."}
          />
        )}
      </div>

      {/* Link Modal with Real-time Shortener */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <LinkIcon size={15} className="text-accent-blue" /> Insert Hyperlink
              </h4>
              <button
                type="button"
                onClick={() => setEnableShortLink(!enableShortLink)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                  enableShortLink
                    ? "bg-accent-blue/15 text-accent-blue border-accent-blue/30"
                    : "bg-muted/10 text-muted border-border hover:text-foreground"
                }`}
              >
                <Scissors size={11} /> {enableShortLink ? "Shortener Active" : "Shorten with devunomieta.xyz"}
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-muted mb-1">Display Text (Optional)</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g. View Project Proposal"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-blue"
              />
            </div>

            <div>
              <label className="block text-[11px] text-muted mb-1">Target Destination URL *</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-blue"
                autoFocus
              />
            </div>

            {enableShortLink && (
              <div className="p-3 bg-header/40 border border-border/80 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-accent-blue flex items-center gap-1">
                    <ExternalLink size={11} /> Custom Branded URL:
                  </span>
                  <span className="text-[10px] text-muted">Editable in real-time</span>
                </div>

                <div className="flex items-center rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">
                  <span className="text-muted select-none font-mono">devunomieta.xyz/</span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="doc002"
                    className="flex-1 bg-transparent text-foreground font-mono font-semibold focus:outline-none ml-0.5"
                  />
                  {slugChecking ? (
                    <Loader2 size={12} className="animate-spin text-muted" />
                  ) : slugStatus?.available ? (
                    <span className="inline-flex items-center text-[10px] text-emerald-400 font-bold gap-0.5">
                      <Check size={11} /> Ready
                    </span>
                  ) : slugStatus?.error ? (
                    <span className="inline-flex items-center text-[10px] text-rose-400 font-medium" title={slugStatus.error}>
                      <AlertCircle size={11} /> Invalid
                    </span>
                  ) : null}
                </div>

                {slugStatus?.error && (
                  <p className="text-[10px] text-rose-400">{slugStatus.error}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 text-xs text-muted hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingLink || (enableShortLink && !slugStatus?.available)}
                onClick={handleInsertLinkModal}
                className="px-4 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {creatingLink && <Loader2 size={12} className="animate-spin" />}
                {enableShortLink ? "Shorten & Insert" : "Insert Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA Button Modal with Real-time Shortener */}
      {showButtonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MousePointerClick size={15} className="text-accent-blue" /> Insert CTA Button
              </h4>
              <button
                type="button"
                onClick={() => setButtonEnableShort(!buttonEnableShort)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                  buttonEnableShort
                    ? "bg-accent-blue/15 text-accent-blue border-accent-blue/30"
                    : "bg-muted/10 text-muted border-border hover:text-foreground"
                }`}
              >
                <Scissors size={11} /> {buttonEnableShort ? "Shortener Active" : "Shorten URL"}
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-muted mb-1">Button Label *</label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="e.g. Schedule Discovery Call"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-blue"
              />
            </div>

            <div>
              <label className="block text-[11px] text-muted mb-1">Target URL *</label>
              <input
                type="url"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://calendly.com/... or Google Drive"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-blue"
              />
            </div>

            {buttonEnableShort && (
              <div className="p-3 bg-header/40 border border-border/80 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-accent-blue flex items-center gap-1">
                    <ExternalLink size={11} /> Shortened Button URL:
                  </span>
                  <span className="text-[10px] text-muted">Editable in real-time</span>
                </div>

                <div className="flex items-center rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">
                  <span className="text-muted select-none font-mono">devunomieta.xyz/</span>
                  <input
                    type="text"
                    value={buttonCustomSlug}
                    onChange={(e) => setButtonCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="btn-call"
                    className="flex-1 bg-transparent text-foreground font-mono font-semibold focus:outline-none ml-0.5"
                  />
                  {buttonSlugStatus?.available ? (
                    <span className="inline-flex items-center text-[10px] text-emerald-400 font-bold gap-0.5">
                      <Check size={11} /> Ready
                    </span>
                  ) : buttonSlugStatus?.error ? (
                    <span className="inline-flex items-center text-[10px] text-rose-400 font-medium" title={buttonSlugStatus.error}>
                      <AlertCircle size={11} /> Invalid
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowButtonModal(false)}
                className="px-3 py-1.5 text-xs text-muted hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingLink || (buttonEnableShort && !buttonSlugStatus?.available)}
                onClick={insertCtaButton}
                className="px-4 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {creatingLink && <Loader2 size={12} className="animate-spin" />}
                Insert Button
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
