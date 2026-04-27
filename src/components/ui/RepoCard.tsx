import { BookIcon, Star, GitFork, Circle } from "lucide-react";
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
  visibility = "Public",
  link = "#",
  className,
}: RepoCardProps) {
  return (
    <a
      href={link}
      className={cn(
        "block p-4 bg-background border border-border rounded-xl hover:border-accent-blue/50 transition-colors border-beam group",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookIcon size={16} className="text-muted group-hover:text-accent-blue transition-colors" />
          <h3 className="text-[15px] font-semibold text-accent-blue hover:underline">
            {name}
          </h3>
        </div>
        <span className="text-xs text-muted border border-border px-2 py-0.5 rounded-full">
          {visibility}
        </span>
      </div>
      <p className="text-muted text-xs mb-4 min-h-[32px] line-clamp-2">
        {description}
      </p>
      <div className="flex items-center gap-4 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <Circle size={10} fill={languageColor} className="text-transparent" />
          <span>{language}</span>
        </div>
        {stars > 0 && (
          <div className="flex items-center gap-1 hover:text-accent-blue transition-colors">
            <Star size={14} />
            <span>{stars}</span>
          </div>
        )}
        {forks > 0 && (
          <div className="flex items-center gap-1 hover:text-accent-blue transition-colors">
            <GitFork size={14} />
            <span>{forks}</span>
          </div>
        )}
      </div>
    </a>
  );
}
