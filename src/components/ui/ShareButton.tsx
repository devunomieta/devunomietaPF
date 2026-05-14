"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  title: string;
  slug: string;
}

export function ShareButton({ title, slug }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/blog/${slug}`;
    const shareData = {
      title: `${title} | Joseph Unomieta`,
      text: `Read this article: ${title}`,
      url: shareUrl,
    };

    // 1. Attempt Native OS Sharing (iOS/Android share sheet)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        // Ignore abort errors (user cancelled sharing)
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing content:", error);
        }
      }
    }

    // 2. Fallback: Copy to clipboard for desktop browsers
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Could not copy text: ", err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-sm font-semibold tracking-wide select-none shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 ${
        copied
          ? "bg-accent-green/15 border-accent-green text-accent-green scale-105"
          : "bg-header/60 hover:bg-header border-border hover:border-accent-blue/50 text-foreground"
      }`}
      title="Share Post"
    >
      {copied ? (
        <>
          <Check size={15} className="animate-pulse" />
          Link Copied!
        </>
      ) : (
        <>
          <Share2 size={15} className="text-accent-blue" />
          Share Post
        </>
      )}
    </button>
  );
}
