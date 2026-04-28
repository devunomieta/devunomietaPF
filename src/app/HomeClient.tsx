"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { BookOpen, Users, MapPin, Link as LinkIcon, Mail, FileText, Zap, ChevronRight, Terminal, Cpu, Layout, Database, History as HistoryIcon } from "lucide-react";
import { ContributionGraph } from "@/components/ui/ContributionGraph";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

/** Silently cleans ?code= from the URL if Supabase misdirects to homepage */
function AuthCodeCleaner() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      window.history.replaceState({}, "", window.location.pathname);
      window.location.href = `/auth/callback?code=${code}`;
    }
  }, [searchParams]);
  return null;
}

interface Profile {
  name?: string;
  handle?: string;
  bio?: string;
  about_me?: string;
  avatar_url?: string;
  location?: string;
  email?: string;
  website?: string;
  titles?: string[];
  tech_stack?: string[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  language_color: string;
  stars: number;
  forks: number;
  visibility: string;
  link: string;
  is_featured: boolean;
}

interface HomeClientProps {
  profile: Profile | null;
  stats: {
    subscribers: number;
    posts: number;
    engagement: number;
  };
  activityData?: Record<string, number>;
  featuredProjects?: Project[];
}

export default function HomeClient({ profile, stats, activityData, featuredProjects = [] }: HomeClientProps) {
  const titles = profile?.titles?.length
    ? profile.titles
    : ["Senior Software Engineer & Architect", "CTO", "Product Growth Manager"];

  const [titleIndex, setTitleIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentTitle = titles[titleIndex];

    if (!isDeleting && displayText === currentTitle) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setTitleIndex((prev) => (prev + 1) % titles.length);
    } else {
      timeout = setTimeout(() => {
        setDisplayText(
          isDeleting
            ? currentTitle.substring(0, displayText.length - 1)
            : currentTitle.substring(0, displayText.length + 1)
        );
      }, isDeleting ? 50 : 100);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, titleIndex, titles]);

  const techStack = [
    { name: "Next.js", icon: Terminal },
    { name: "TypeScript", icon: Cpu },
    { name: "React", icon: Layout },
    { name: "Supabase", icon: Database },
    { name: "Tailwind", icon: Layout },
    { name: "Node.js", icon: Terminal },
  ];

  return (
    <div className="py-2 w-full">
      <Suspense fallback={null}>
        <AuthCodeCleaner />
      </Suspense>
      <div className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] gap-8">
        {/* Left Sidebar */}
        <aside className="flex flex-col gap-6">
          {/* Avatar */}
          <div className="relative w-full max-w-[300px] aspect-square rounded-full border border-border overflow-hidden glow mx-auto md:mx-0">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/20 to-transparent z-10 pointer-events-none mix-blend-overlay" />
            {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.name || "Avatar"}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover"
                  priority
                />
            ) : (
              <div className="w-full h-full bg-header flex items-center justify-center text-muted font-mono text-sm">
                [Avatar Placeholder]
              </div>
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate-none sm:truncate">
              {profile?.name || "Joseph Unomieta"}
            </h1>
            <h2 className="text-lg sm:text-xl font-light text-muted mb-4">
              {profile?.handle || "DevUnomieta"}
            </h2>

            {/* Typewriter titles */}
            <div className="min-h-[4rem] sm:min-h-[3rem] mb-4 font-mono text-sm text-foreground leading-relaxed whitespace-normal break-words">
              <span className="text-accent-blue font-bold">{">"}</span> {displayText}
              <span className="animate-pulse bg-accent-blue ml-0.5 inline-block w-1.5 h-4 align-middle"></span>
            </div>

            <p className="text-sm text-foreground mb-6 leading-relaxed">
              {profile?.bio || "Building web products that work and helping them grow. Strategist, architect, and hands-on builder."}
            </p>

            {/* Official Social Logos */}
            <div className="flex items-center gap-3 mb-4">
              <a
                href="https://x.com/DevUnomieta"
                target="_blank"
                className="flex-1 flex items-center justify-center py-2.5 rounded-md bg-header border border-border text-foreground hover:border-accent-blue hover:text-accent-blue transition-all"
                title="Follow on X"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com/in/joseph-unomieta"
                target="_blank"
                className="flex-1 flex items-center justify-center py-2.5 rounded-md bg-header border border-border text-foreground hover:border-accent-blue hover:text-accent-blue transition-all"
                title="Connect on LinkedIn"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.23 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.43c-1.14 0-2.06-.92-2.06-2.06 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.06-2.06 2.06zM20.45 20.45h-3.56v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.15 1.46-2.15 2.96v5.7h-3.56V9h3.42v1.56h.05c.48-.9 1.62-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z" />
                </svg>
              </a>
              <a
                href="/resume.pdf"
                target="_blank"
                className="flex-1 flex items-center justify-center py-2.5 rounded-md bg-accent-blue text-white hover:bg-accent-blue/90 transition-all shadow-lg shadow-accent-blue/20"
                title="Download Resume"
              >
                <FileText size={18} />
              </a>
            </div>

            <Link
              href="/contact?purpose=hiring"
              className="w-full flex items-center justify-center py-2 px-3 rounded-md border border-accent-blue/50 text-accent-blue hover:bg-accent-blue/10 transition-all text-sm font-bold mb-6"
            >
              Hire me
            </Link>

            <div className="flex flex-col gap-3 text-sm text-muted">
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-header/20 border border-border/50 glow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-accent-blue" />
                    <span className="font-medium">Subscribers</span>
                  </div>
                  {/* <strong className="text-foreground font-mono">{stats.subscribers}</strong> */}
                  <strong className="text-foreground font-mono">12,065</strong>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-accent-green" />
                    <span className="font-medium">Blog Posts</span>
                  </div>
                  <strong className="text-foreground font-mono">{stats.posts}</strong>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-yellow-500 fill-current" />
                    <span className="font-medium text-foreground">Engagement</span>
                  </div>
                  <strong className="text-accent-blue font-mono">{stats.engagement}%</strong>
                </div>
              </div>

              <div className="mt-4 space-y-3 px-1">
                {profile?.location && (
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-muted/70" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile?.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-muted/70" />
                    <a href={`mailto:${profile.email}`} className="hover:text-accent-blue transition-colors hover:underline">
                      {profile.email}
                    </a>
                  </div>
                )}
                {profile?.website && (
                  <div className="flex items-center gap-3">
                    <LinkIcon size={16} className="text-muted/70" />
                    <a href={profile.website} target="_blank" className="hover:text-accent-blue transition-colors hover:underline">
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content */}
        <div className="flex flex-col gap-8">
          <div className="border border-border rounded-xl overflow-hidden bg-background shadow-xl">
            <div className="bg-header px-4 py-2 border-b border-border flex items-center gap-2 text-xs font-semibold text-foreground">
              <BookOpen size={14} className="text-muted" />
              README.md
            </div>
            <div className="p-8 prose prose-invert prose-p:text-muted prose-a:text-accent-blue max-w-none">
              <h2 className="text-foreground border-b border-border pb-3 flex items-center gap-3">
                Hi there, I&apos;m {profile?.name?.split(" ")[0] || "Joseph"} 👋
              </h2>
              <div className="prose prose-invert prose-p:text-muted prose-a:text-accent-blue prose-li:text-muted max-w-none mb-8">
                <ReactMarkdown>
                  {profile?.about_me 
                    ? profile.about_me.replace(/\\n/g, '\n') 
                    : "I am a Senior Software Engineer, CTO, and Product Growth Manager. I specialize in architecting scalable web applications, optimizing engineering workflows, and driving product success."}
                </ReactMarkdown>
              </div>

              <h3 className="text-foreground mt-8 mb-4">Core Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {(profile?.tech_stack?.length ? profile.tech_stack : ["Next.js", "TypeScript", "React", "Supabase", "Tailwind", "Node.js"]).map((tech) => (
                  <span key={tech} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-header border border-border text-[10px] font-bold text-foreground">
                    <Terminal size={12} className="text-accent-blue" />
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="border border-border rounded-xl p-6 bg-background shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-foreground text-xl font-bold flex items-center gap-3">
                  <Layout size={24} className="text-accent-blue" />
                  Featured Repositories
                </h2>
                <Link href="/projects" className="text-xs text-accent-blue font-bold flex items-center gap-1 hover:underline">
                  View all repositories <ChevronRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredProjects.map((project) => (
                  <a
                    key={project.id}
                    href={project.link}
                    target="_blank"
                    className="p-5 rounded-xl border border-border bg-header/10 hover:border-accent-blue/30 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Terminal size={40} />
                    </div>
                    <h4 className="text-accent-blue text-lg font-bold group-hover:underline flex items-center justify-between">
                      {project.name}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 capitalize">{project.visibility}</span>
                    </h4>
                    <p className="text-sm text-muted mt-2 leading-relaxed line-clamp-2">{project.description}</p>
                    <div className="mt-4 flex items-center gap-4 text-[10px] text-muted">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.language_color || '#3178c6' }} />
                        {project.language}
                      </span>
                      <span>⭐ {project.stars}</span>
                      <span>forks {project.forks}</span>
                    </div>
                  </a>
                ))}
                {featuredProjects.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-muted border border-dashed border-border rounded-xl">
                    No pinned repositories found. Manage them in the admin dashboard.
                  </div>
                )}
              </div>
            </div>

            <div className="border border-border rounded-xl p-6 bg-background shadow-xl">
              <h2 className="text-foreground text-xl font-bold mb-6 flex items-center gap-3">
                <HistoryIcon size={24} className="text-accent-green" />
                Contribution Activity
              </h2>
              <ContributionGraph activityData={activityData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
