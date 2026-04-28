import { Book, GraduationCap, Award, Code, Shield, Zap, Droplets } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { NewsletterSection } from "@/components/ui/NewsletterSection";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  GraduationCap,
  Award,
  Code,
  Shield,
  Zap,
};

function getIcon(iconName: string) {
  return ICON_MAP[iconName] ?? Award;
}

export default async function Academic() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("academic")
    .select("*")
    .order("sort_order", { ascending: true });

  const degrees = (items || []).filter((i) => i.category === "degree");
  const certifications = (items || []).filter((i) => i.category === "certification");

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Book size={24} className="text-muted" />
        <h1 className="text-2xl font-semibold text-foreground">Wiki</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Degrees */}
        <section className="bg-background border border-border rounded-xl p-6 glow">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <GraduationCap className="text-accent-blue" size={24} />
            <h2 className="text-xl font-medium text-foreground">Academic Profile</h2>
          </div>

          {degrees.length === 0 ? (
            <p className="text-sm text-muted">No degrees added yet.</p>
          ) : (
            <div className="space-y-6">
              {degrees.map((item) => (
                <div key={item.id}>
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm font-medium text-accent-blue mb-1">{item.subtitle}</p>
                  <p className="text-sm text-muted leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Certifications */}
        <section className="bg-background border border-border rounded-xl p-6 glow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-green/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />

          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <Award className="text-accent-green" size={24} />
            <h2 className="text-xl font-medium text-foreground">Certifications</h2>
          </div>

          {certifications.length === 0 ? (
            <p className="text-sm text-muted">No certifications added yet.</p>
          ) : (
            <div className="space-y-5">
              {certifications.map((item) => {
                const Icon = getIcon(item.icon_name);
                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-0.5 shrink-0 w-7 h-7 rounded-md bg-accent-blue/10 flex items-center justify-center">
                      <Icon size={14} className="text-accent-blue" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <p className="text-xs text-accent-blue mb-0.5">{item.subtitle}</p>
                      <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Research section - static, always shown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-background border border-border rounded-xl p-6 glow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-green/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <Zap className="text-accent-green" size={24} />
            <h2 className="text-xl font-medium text-foreground">Research Lab</h2>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="text-accent-blue">{"{ }"}</span> Web3 Infrastructure
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Exploring scalable layer-1 and layer-2 solutions. Primary focus on <strong>Solana</strong> program development and <strong>EVM-compatible</strong> smart contracts, aiming to bridge traditional finance with decentralized architectures.
              </p>
            </div>
            <div className="pt-4 border-t border-border/50">
              <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                <Droplets className="text-accent-green" size={16} /> Sustainable Energy
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Researching the intersection of technology and green infrastructure. Building software tools to optimize energy consumption, logistics routing, and carbon offset tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Skills section */}
        <section className="bg-background border border-border rounded-xl p-6 glow">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <Code className="text-accent-blue" size={24} />
            <h2 className="text-xl font-medium text-foreground">Skills</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Frontend", skills: "React, Next.js, TypeScript, HTML/CSS" },
              { label: "Backend", skills: "Node.js, Supabase, PostgreSQL, REST APIs" },
              { label: "Tools", skills: "Git, GitHub, CI/CD, Vercel, Netlify" },
              { label: "CMS / No-Code", skills: "WordPress, Shopify, GoHighLevel" },
              { label: "Project Mgmt", skills: "Agile, PMI, Stakeholder Mgmt, CRM" },
              { label: "Web3", skills: "Solana, EVM, Smart Contracts (in progress)" },
            ].map(({ label, skills }) => (
              <div key={label} className="flex gap-3 text-sm">
                <span className="text-accent-blue font-mono w-24 shrink-0">{label}</span>
                <span className="text-muted">{skills}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <NewsletterSection />
    </div>
  );
}
