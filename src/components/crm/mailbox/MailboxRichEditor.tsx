"use client";

import { useRef, useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Code,
  Smile,
  Undo,
  Redo,
  RemoveFormatting,
} from "lucide-react";

interface MailboxRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

const COMMON_EMOJIS = [
  "👋", "✨", "🚀", "💡", "🤝", "✅", "🎉", "🔥", "📩", "👍", "🙏", "⭐"
];

export function MailboxRichEditor({
  value,
  onChange,
  placeholder = "Write your message here...",
  minHeight = "120px",
  className = "",
}: MailboxRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [isEmpty, setIsEmpty] = useState(!value || value === "<br>" || value.trim() === "");

  // Sync external value changes into the editor if not actively focused
  useEffect(() => {
    if (editorRef.current) {
      if (document.activeElement !== editorRef.current) {
        if (editorRef.current.innerHTML !== (value || "")) {
          editorRef.current.innerHTML = value || "";
        }
      }
    }
    const cleanText = (value || "").replace(/<[^>]*>/g, "").trim();
    setIsEmpty(cleanText === "" && !value.includes("<img"));
  }, [value]);

  const exec = (command: string, arg?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const cleanText = html.replace(/<[^>]*>/g, "").trim();
    setIsEmpty(cleanText === "" && !html.includes("<img"));
    onChange(html);
  };

  const handleInsertLink = () => {
    if (linkUrl && linkUrl !== "https://") {
      exec("createLink", linkUrl);
      setShowLinkModal(false);
      setLinkUrl("https://");
    }
  };

  return (
    <div className={`border border-border rounded-xl bg-header/20 overflow-hidden shadow-sm flex flex-col focus-within:border-accent-blue/80 transition-colors ${className}`}>
      {/* WYSIWYG Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-2.5 py-1.5 bg-header/40 border-b border-border text-xs select-none">
        <div className="flex flex-wrap items-center gap-0.5">
          <button
            type="button"
            onClick={() => exec("bold")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Bold (Ctrl+B)"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Italic (Ctrl+I)"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            onClick={() => exec("underline")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Underline (Ctrl+U)"
          >
            <Underline size={13} />
          </button>
          <button
            type="button"
            onClick={() => exec("strikeThrough")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Strikethrough"
          >
            <Strikethrough size={13} />
          </button>

          <span className="w-[1px] h-3.5 bg-border/60 mx-1" />

          <button
            type="button"
            onClick={() => exec("formatBlock", "<h2>")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition font-semibold text-[11px]"
            title="Heading"
          >
            <Heading2 size={13} />
          </button>

          <button
            type="button"
            onClick={() => exec("insertUnorderedList")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Bullet list"
          >
            <List size={13} />
          </button>

          <button
            type="button"
            onClick={() => exec("insertOrderedList")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Numbered list"
          >
            <ListOrdered size={13} />
          </button>

          <button
            type="button"
            onClick={() => exec("formatBlock", "<blockquote>")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Quote block"
          >
            <Quote size={13} />
          </button>

          <span className="w-[1px] h-3.5 bg-border/60 mx-1" />

          {/* Link button */}
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Insert Link"
          >
            <LinkIcon size={13} />
          </button>

          {/* Emoji button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
              title="Insert Emoji"
            >
              <Smile size={13} />
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-full mt-1.5 z-40 bg-card border border-border rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1 w-44">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      exec("insertText", emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1 text-base hover:bg-header rounded transition text-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => exec("removeFormat")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Clear formatting"
          >
            <RemoveFormatting size={13} />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => exec("undo")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Undo"
          >
            <Undo size={12} />
          </button>
          <button
            type="button"
            onClick={() => exec("redo")}
            className="p-1.5 rounded hover:bg-header text-muted hover:text-foreground transition"
            title="Redo"
          >
            <Redo size={12} />
          </button>

          <span className="w-[1px] h-3.5 bg-border/60 mx-1" />

          <button
            type="button"
            onClick={() => {
              if (isSourceMode && editorRef.current) {
                editorRef.current.innerHTML = value || "";
              }
              setIsSourceMode(!isSourceMode);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition ${
              isSourceMode ? "bg-accent-blue text-white" : "hover:bg-header text-muted hover:text-foreground"
            }`}
            title="Toggle HTML Source"
          >
            <Code size={12} />
            <span>HTML</span>
          </button>
        </div>
      </div>

      {/* Editor Editable Area */}
      <div className="relative p-3 bg-background/50">
        {isSourceMode ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ minHeight }}
            className="w-full font-mono text-xs bg-neutral-950/80 text-foreground p-2.5 rounded-lg border border-border focus:outline-none resize-y"
            placeholder="Write HTML code here..."
          />
        ) : (
          <div className="relative">
            {isEmpty && (
              <div className="absolute top-0 left-0 text-muted pointer-events-none text-xs select-none">
                {placeholder}
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              style={{ minHeight }}
              className="text-xs text-foreground leading-relaxed focus:outline-none outline-none prose prose-invert max-w-none [&_a]:text-accent-blue [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-accent-blue [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1"
            />
          </div>
        )}
      </div>

      {/* Hyperlink Dialog */}
      {showLinkModal && (
        <div className="p-2.5 bg-header/40 border-t border-border flex items-center gap-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-accent-blue"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleInsertLink();
              }
            }}
          />
          <button
            type="button"
            onClick={handleInsertLink}
            className="px-2.5 py-1 bg-accent-blue text-white text-xs font-medium rounded-lg hover:bg-accent-blue/90"
          >
            Insert
          </button>
          <button
            type="button"
            onClick={() => setShowLinkModal(false)}
            className="px-2 py-1 text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
