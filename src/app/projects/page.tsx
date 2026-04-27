import { RepoCard } from "@/components/ui/RepoCard";
import { FolderGit2 } from "lucide-react";

const projects = [
  {
    name: "Klamo",
    description: "Web3 SocialFi platform connecting creators and communities through decentralized engagement and rewards.",
    language: "Solidity/React",
    languageColor: "#3178c6",
    stars: 128,
    forks: 34,
    link: "#"
  },
  {
    name: "Flarerider",
    description: "Green Logistics dashboard for optimizing delivery routes and tracking carbon offset metrics in real-time.",
    language: "Next.js",
    languageColor: "#ededed",
    stars: 85,
    forks: 12,
    link: "#"
  },
  {
    name: "Hachstacks",
    description: "An EdTech platform offering personalized learning paths, interactive modules, and progress analytics.",
    language: "Node.js",
    languageColor: "#339933",
    stars: 210,
    forks: 45,
    link: "#"
  },
  {
    name: "Trazen-Core",
    description: "Core API services and business logic engine built for Trazen's enterprise clients.",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 42,
    visibility: "Private" as const,
    link: "#"
  },
  {
    name: "WP-Headless-Starter",
    description: "A customized WordPress headless starter template integrated with Next.js App Router and GraphQL.",
    language: "JavaScript",
    languageColor: "#f1e05a",
    stars: 18,
    forks: 5,
    link: "#"
  },
  {
    name: "Solana-Pay-Module",
    description: "A plug-and-play e-commerce module for accepting Solana and USDC payments with instant settlement.",
    language: "Rust",
    languageColor: "#dea584",
    stars: 56,
    link: "#"
  }
];

export default function Projects() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
        <FolderGit2 size={24} className="text-muted" />
        <h1 className="text-2xl font-semibold text-foreground">Repositories</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {projects.map((project) => (
          <RepoCard key={project.name} {...project} />
        ))}
      </div>
    </div>
  );
}
