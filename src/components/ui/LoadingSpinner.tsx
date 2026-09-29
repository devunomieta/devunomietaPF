import { Loader2 } from "lucide-react";

export function LoadingSpinner({
  label = "Loading...",
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6";

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 gap-3 min-h-[220px] w-full text-muted animate-in fade-in duration-300">
      <div className="p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-full text-accent-blue">
        <Loader2 className={`${sizeClass} animate-spin`} />
      </div>
      <p className="text-xs sm:text-sm font-medium tracking-wide text-foreground/80">{label}</p>
    </div>
  );
}

export function PageSkeleton({ title = "Loading content" }: { title?: string }) {
  return (
    <div className="space-y-6 animate-pulse w-full">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="space-y-2">
          <div className="h-6 bg-header/60 rounded w-48" />
          <div className="h-3 bg-header/40 rounded w-64" />
        </div>
        <div className="h-8 bg-header/60 rounded-lg w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-header/40 border border-border/50 rounded-xl" />
        <div className="h-24 bg-header/40 border border-border/50 rounded-xl" />
        <div className="h-24 bg-header/40 border border-border/50 rounded-xl" />
      </div>
      <div className="h-64 bg-header/30 border border-border/50 rounded-xl p-4 flex items-center justify-center">
        <LoadingSpinner label={title} />
      </div>
    </div>
  );
}
