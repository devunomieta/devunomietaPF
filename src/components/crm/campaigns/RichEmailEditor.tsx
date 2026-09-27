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
} from "lucide-react";
import { SUPPORTED_PERSONALIZATION_VARIABLES } from "@/lib/crm/personalization";
import { uploadCampaignImage } from "@/app/crm/campaigns/actions";

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
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(value);
  const [uploadingImage, setUploadingImage] = useState(false);

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
  const [buttonText, setButtonText] = useState("Book Consultation");
  const [buttonUrl, setButtonUrl] = useState("https://");

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

  // Insert a Call-To-Action (CTA) email button block
  const insertCtaButton = () => {
    if (!buttonText || !buttonUrl) return;
    const buttonHtml = `
      <div style="margin: 24px 0; text-align: center;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="#2563eb">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${buttonText}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-- -->
        <a href="${buttonUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);">
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

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-card border border-border rounded-xl p-4 w-full max-w-sm shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-semibold text-foreground">Insert Hyperlink</h4>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-blue"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (linkUrl) exec("createLink", linkUrl);
                  setShowLinkModal(false);
                }}
                className="px-3 py-1 rounded bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA Button Modal */}
      {showButtonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-card border border-border rounded-xl p-4 w-full max-w-sm shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-semibold text-foreground">Insert Call-To-Action Button</h4>
            <div>
              <label className="block text-[11px] text-muted mb-1">Button Label</label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="e.g. Schedule Discovery Call"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-blue"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted mb-1">Target URL</label>
              <input
                type="url"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://yourlink.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent-blue"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowButtonModal(false)}
                className="px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertCtaButton}
                className="px-3 py-1 rounded bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90"
              >
                Insert Button
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
