import { Book, GraduationCap, Zap, Droplets } from "lucide-react";

export default function Academic() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Book size={24} className="text-muted" />
        <h1 className="text-2xl font-semibold text-foreground">Wiki</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Academic Background */}
        <section className="bg-background border border-border rounded-xl p-6 glow">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <GraduationCap className="text-accent-blue" size={24} />
            <h2 className="text-xl font-medium text-foreground">Academic Profile</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Master of Information Technology</h3>
              <p className="text-sm font-medium text-accent-blue mb-2">Miva Open University</p>
              <p className="text-sm text-muted">Specialization in Software Engineering.</p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Key Coursework</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                  Artificial Intelligence & Machine Learning
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                  Advanced DevOps & CI/CD Pipelines
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                  Distributed Database Management
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                  Software Architecture & Design Patterns
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Research Lab */}
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
                Researching the intersection of technology and green infrastructure. Building software tools to optimize energy consumption, logistics routing (e.g., Flarerider), and carbon offset tracking.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
