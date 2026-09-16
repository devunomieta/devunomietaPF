import { BookIcon, Star, GitFork } from "lucide-react";
import { cn } from "@/lib/utils";

interface RepoCardProps {
  name: string;
  description: string;
  language: string;
  languageColor: string;
  stars?: number;
  forks?: number;
  visibility?: "Public" | "Private";
  link?: string;
  className?: string;
}

export function RepoCard({
  name,
  description,
  language,
  languageColor,
  stars = 0,
  forks = 0,
  link = "#",
  className,
}: RepoCardProps) {
  const isLive = Boolean(link && link.trim() !== "" && link.trim() !== "#" && link.trim() !== "javascript:void(0)");
  const statusBadge = isLive ? "Live" : "Locally Hosted";

  return (
    <a
      href={link}
      target={isLive ? "_blank" : "_self"}
      rel="noopener noreferrer"
      className={cn(
        "group relative flex flex-col justify-between p-5 bg-header/20 hover:bg-header/40 border border-border/80 hover:border-accent-blue/50 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-accent-blue/5 hover:-translate-y-0.5 overflow-hidden",
        className
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent-blue/5 rounded-full blur-2xl group-hover:bg-accent-blue/10 transition-all pointer-events-none" />

      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-header border border-border/60 group-hover:border-accent-blue/40 text-muted group-hover:text-accent-blue transition-colors shrink-0">
              <BookIcon size={15} />
            </div>
            <h3 className="text-sm font-semibold text-foreground group-hover:text-accent-blue transition-colors truncate">
              {name}
            </h3>
          </div>
          <span
            className={cn(
              "text-[10px] font-mono font-medium px-2 py-0.5 rounded-md shrink-0 border transition-colors",
              isLive
                ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                : "bg-header/60 border-border/60 text-muted"
            )}
          >
            {statusBadge}
          </span>
        </div>

        <p className="text-muted text-xs leading-relaxed mb-4 line-clamp-2 font-normal">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-mono text-muted/80 pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: languageColor || '#3178c6' }} />
          <span className="text-foreground/90 font-sans font-medium">{language}</span>
        </div>
        {stars > 0 && (
          <div className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Star size={12} className="text-amber-400 fill-amber-400/20" />
            <span>{stars}</span>
          </div>
        )}
        {forks > 0 && (
          <div className="flex items-center gap-1 hover:text-foreground transition-colors">
            <GitFork size={12} />
            <span>{forks}</span>
          </div>
        )}
      </div>
    </a>
  );
}
