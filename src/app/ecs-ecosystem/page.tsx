import type { Metadata } from "next";
import Link from "next/link";
import { Home, Briefcase, Video, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "ECS Ecosystem | Joseph Unomieta",
  description: "Explore the ECS Ecosystem demonstration and architecture overview.",
  openGraph: {
    title: "ECS Ecosystem | Joseph Unomieta",
    description: "Introduction, priotized ECS venture, problems I'm solving, and my first 90 days..",
    type: "website",
  },
};

export default function EcsEcosystemPage() {
  const vimeoEmbedUrl = "https://player.vimeo.com/video/1233721147?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1";
  const vimeoDirectUrl = "https://vimeo.com/1233721147";

  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-10 space-y-8 animate-fade-in">
      {/* Hero Header Section */}
      <header className="space-y-4 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-header border border-border text-accent-blue">
          <Video size={14} className="animate-pulse" />
          <span>Introduction Video</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
          ECS Ecosystem
        </h1>

        <p className="text-muted text-base sm:text-lg max-w-2xl leading-relaxed">
          My introduction, priotized ECS venture, problems I&apos;m solving, and my first 90 days..
        </p>
      </header>

      {/* Video Container Frame */}
      <section 
        aria-label="ECS Ecosystem Video Player"
        className="relative bg-header border border-border rounded-2xl overflow-hidden shadow-2xl p-2 sm:p-3"
      >
        <div className="relative w-full aspect-[100/72.68] rounded-xl overflow-hidden bg-black border border-border/60 mx-auto">
          <iframe
            id="ecs-ecosystem-video-frame"
            src={vimeoEmbedUrl}
            title="Unomieta - ECS"
            className="w-full h-full border-0 rounded-lg absolute inset-0"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>

        <div className="mt-3 px-2 flex items-center justify-between text-xs text-muted">
          <span>Embedded Video Player</span>
          <a
            href={vimeoDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-accent-blue transition-colors"
          >
            <span>Open in Vimeo</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </section>

      {/* CTA Navigation Buttons */}
      <section aria-label="Quick Navigation" className="pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center sm:justify-start gap-3 sm:gap-4">
          <Link
            id="cta-home-btn"
            href="/"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg border border-border bg-header text-foreground hover:bg-border/60 hover:text-white transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          >
            <Home size={18} className="text-accent-blue" />
            <span>Home</span>
          </Link>

          <Link
            id="cta-experiences-btn"
            href="/experience"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition-all text-sm font-medium shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          >
            <Briefcase size={18} />
            <span>Experiences</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
