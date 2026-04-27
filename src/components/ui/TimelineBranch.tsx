import { GitCommit } from "lucide-react";

interface TimelineItem {
  id: string;
  role: string;
  company: string;
  date: string;
  description: React.ReactNode;
}

interface TimelineBranchProps {
  items: TimelineItem[];
}

export function TimelineBranch({ items }: TimelineBranchProps) {
  return (
    <div className="relative pl-6 md:pl-8 py-4">
      {/* The main vertical branch line */}
      <div className="absolute top-0 bottom-0 left-[15px] md:left-[19px] w-0.5 bg-border rounded-full" />

      <div className="space-y-12">
        {items.map((item, index) => (
          <div key={item.id} className="relative group">
            {/* The Commit Node */}
            <div className="absolute -left-6 md:-left-8 top-1">
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border-2 border-background group-hover:border-accent-blue/20 transition-colors z-10 relative">
                <GitCommit className="text-muted group-hover:text-accent-blue transition-colors" size={18} />
              </div>
            </div>

            <div className="bg-header/30 border border-border rounded-lg p-5 hover:border-accent-blue/50 transition-colors relative glow">
              {/* Optional branch line connecting node to card if you want that look, but simple looks cleaner */}
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-accent-blue transition-colors">
                    {item.role}
                  </h3>
                  <p className="text-sm font-medium text-foreground/80">{item.company}</p>
                </div>
                <div className="text-xs font-mono text-muted whitespace-nowrap bg-header px-2 py-1 rounded-md border border-border">
                  {item.date}
                </div>
              </div>
              <div className="text-sm text-muted leading-relaxed space-y-2">
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* End of branch */}
      <div className="absolute bottom-[-10px] left-[11px] md:left-[15px]">
        <div className="w-2.5 h-2.5 rounded-full bg-border" />
      </div>
    </div>
  );
}
