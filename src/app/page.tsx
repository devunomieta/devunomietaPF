"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookOpen, Users, Star, MapPin, Link as LinkIcon, Mail } from "lucide-react";
import { ContributionGraph } from "@/components/ui/ContributionGraph";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const titles = [
  "Senior Software Engineer & Architect",
  "CTO",
  "Product Growth Manager"
];

function AuthFallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      router.push(`/auth/callback?code=${code}`);
    }
  }, [searchParams, router]);

  return null;
}

export default function Home() {
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
  }, [displayText, isDeleting, titleIndex]);

  return (
    <>
      <Suspense fallback={null}>
        <AuthFallback />
      </Suspense>
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
      {/* Left Sidebar - Profile Info */}
      <aside className="flex flex-col gap-6">
        <div className="relative w-full max-w-[300px] aspect-square rounded-full border border-border overflow-hidden glow mx-auto md:mx-0">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/20 to-transparent z-10 pointer-events-none mix-blend-overlay"></div>
          {/* We use a placeholder image URL for now; replace with actual avatar */}
          <div className="w-full h-full bg-header flex items-center justify-center text-muted font-mono">
            [Avatar Placeholder]
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Joseph Unomieta</h1>
          <h2 className="text-xl font-light text-muted mb-4">@DevUnomieta</h2>
          
          <div className="h-12 mb-4 font-mono text-sm text-foreground">
            <span className="text-accent-blue">{">"}</span> {displayText}
            <span className="animate-pulse">_</span>
          </div>

          <p className="text-sm text-foreground mb-6">
            Building web products that work and helping them grow. Strategist, architect, and hands-on builder.
          </p>

          <a 
            href="mailto:hello@devunomieta.xyz"
            className="w-full flex items-center justify-center py-1.5 px-3 rounded-md bg-header border border-border text-foreground hover:bg-border transition-colors text-sm font-semibold mb-4"
          >
            Follow
          </a>

          <div className="flex flex-col gap-2 text-sm text-muted">
            <div className="flex items-center gap-2 hover:text-accent-blue cursor-pointer transition-colors">
              <Users size={16} />
              <span><strong className="text-foreground">1.2k</strong> followers</span>
              <span>·</span>
              <span><strong className="text-foreground">42</strong> following</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <MapPin size={16} />
              <span>Global / Remote</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={16} />
              <a href="mailto:hello@devunomieta.xyz" className="hover:text-accent-blue transition-colors hover:underline">hello@devunomieta.xyz</a>
            </div>
            <div className="flex items-center gap-2">
              <LinkIcon size={16} />
              <a href="https://devunomieta.xyz" className="hover:text-accent-blue transition-colors hover:underline">devunomieta.xyz</a>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Content - README and Graph */}
      <div className="flex flex-col gap-8">
        <div className="border border-border rounded-xl overflow-hidden bg-background">
          <div className="bg-header px-4 py-2 border-b border-border flex items-center gap-2 text-xs font-semibold text-foreground">
            <BookOpen size={14} className="text-muted" />
            README.md
          </div>
          <div className="p-6 prose prose-invert prose-p:text-muted prose-a:text-accent-blue max-w-none">
            <h2 className="text-foreground border-b border-border pb-2">Hi there, I'm Joseph 👋</h2>
            <p>
              I am a Senior Software Engineer, CTO, and Product Growth Manager. I specialize in architecting scalable web applications, optimizing engineering workflows, and driving product success.
            </p>
            <ul>
              <li>🔭 I’m currently working on high-performance web products.</li>
              <li>🌱 I’m deeply interested in <strong>Web3 (Solana/EVM)</strong> and <strong>Sustainable Energy infrastructure</strong>.</li>
              <li>💬 Ask me about React, Next.js, System Architecture, and Team Leadership.</li>
              <li>⚡ Fun fact: I boost team productivity by 60% using tailored CI/CD pipelines.</li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-foreground text-base mb-2">Milestones & Activity</h2>
          <ContributionGraph />
        </div>
      </div>
      </div>
    </>
  );
}
