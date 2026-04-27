import { RepoCard } from "@/components/ui/RepoCard";
import { FolderGit2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function Projects() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
        <FolderGit2 size={24} className="text-muted" />
        <h1 className="text-2xl font-semibold text-foreground">Repositories</h1>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p>No projects yet. Add them via the admin panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <RepoCard
              key={project.id}
              name={project.name}
              description={project.description}
              language={project.language}
              languageColor={project.language_color}
              stars={project.stars}
              forks={project.forks}
              visibility={project.visibility === "private" ? "Private" : "Public"}
              link={project.link || "#"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
