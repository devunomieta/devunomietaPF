import { TimelineBranch } from "@/components/ui/TimelineBranch";
import { GitBranch } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function Experience() {
  const supabase = await createClient();

  const { data: experience } = await supabase
    .from("experience")
    .select("*")
    .order("sort_order", { ascending: true });

  const items = (experience || []).map((e) => ({
    id: e.id,
    role: e.role,
    company: e.company,
    date: e.date_range,
    description: e.description,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
        <GitBranch size={24} className="text-muted" />
        <h1 className="text-2xl font-semibold text-foreground">Commit History</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p>No experience entries yet. Add them via the admin panel.</p>
        </div>
      ) : (
        <div className="bg-background rounded-xl">
          <TimelineBranch items={items} />
        </div>
      )}
    </div>
  );
}
