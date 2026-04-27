"use client";

import { useState } from "react";
import { reactToPostAction } from "@/app/blog/actions";
import { ThumbsUp, ThumbsDown } from "lucide-react";

export function Reactions({ postId, initialLikes, initialDislikes }: { postId: string, initialLikes: number, initialDislikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [hasReacted, setHasReacted] = useState(false);

  const handleReact = async (type: 'like' | 'dislike') => {
    if (hasReacted) return;
    
    // Optimistic update
    setHasReacted(true);
    if (type === 'like') setLikes(l => l + 1);
    else setDislikes(d => d + 1);

    await reactToPostAction(postId, type);
  }

  return (
    <div className="flex items-center gap-4 py-6 border-t border-b border-border my-12">
      <span className="text-sm font-semibold text-foreground mr-2">Was this article helpful?</span>
      <button 
        onClick={() => handleReact('like')}
        disabled={hasReacted}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors border ${hasReacted ? 'opacity-50 cursor-not-allowed border-border text-muted bg-transparent' : 'border-border text-foreground hover:border-accent-blue hover:text-accent-blue bg-header/50'}`}
      >
        <ThumbsUp size={14} /> {likes}
      </button>
      <button 
        onClick={() => handleReact('dislike')}
        disabled={hasReacted}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors border ${hasReacted ? 'opacity-50 cursor-not-allowed border-border text-muted bg-transparent' : 'border-border text-foreground hover:text-red-400 hover:border-red-400/50 bg-header/50'}`}
      >
        <ThumbsDown size={14} /> {dislikes}
      </button>
    </div>
  )
}
