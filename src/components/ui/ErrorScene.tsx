"use client";

import { motion } from "framer-motion";
import { RotateCcw, ArrowLeft, Home } from "lucide-react";

export function ErrorScene({
  code,
  title,
  description,
  onRetry,
  homeHref,
  homeLabel,
  digest,
}: {
  code: string;
  title: string;
  description: string;
  onRetry?: () => void;
  homeHref: string;
  homeLabel: string;
  digest?: string;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="inline-flex items-center gap-2 font-mono text-xs text-muted bg-header/40 border border-border rounded-full px-3 py-1 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span>process.exit({code})</span>
        </div>

        <div className="font-mono text-6xl sm:text-7xl font-bold text-accent-blue animate-glitch select-none mb-4">
          {code}
          <span className="inline-block w-2 sm:w-3 bg-accent-blue ml-1 animate-cursor-blink align-middle h-10 sm:h-12" />
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted mb-8">{description}</p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all text-sm flex items-center gap-2"
            >
              <RotateCcw size={15} />
              Try again
            </button>
          )}
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-header/50 transition-all text-sm flex items-center gap-2"
          >
            <ArrowLeft size={15} />
            Go back
          </button>
          <a
            href={homeHref}
            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-header/50 transition-all text-sm flex items-center gap-2"
          >
            <Home size={15} />
            {homeLabel}
          </a>
        </div>

        {digest && <p className="mt-8 font-mono text-[11px] text-muted/60">ref: {digest}</p>}
      </motion.div>
    </div>
  );
}
