import { TimelineBranch } from "@/components/ui/TimelineBranch";
import { GitBranch } from "lucide-react";

const experienceItems = [
  {
    id: "netisens",
    role: "CTO / General Manager",
    company: "Netisens Tech",
    date: "2023 - Present",
    description: (
      <>
        <p>
          Directed overall technology strategy and operations. Led cross-functional teams to build high-performance products and streamlined engineering workflows.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted">
          <li>Boosted team productivity by 60% through custom CI/CD pipelines and agile methodologies.</li>
          <li>Attained 130% success criteria on key deliverables within the first year.</li>
          <li>Architected highly scalable cloud infrastructure ensuring 99.99% uptime for core applications.</li>
        </ul>
      </>
    )
  },
  {
    id: "trazen",
    role: "Co-Founder & CTO",
    company: "Trazen",
    date: "2021 - 2023",
    description: (
      <>
        <p>
          Spearheaded the technical vision from inception to launch. Built and scaled the foundational architecture for the startup&apos;s primary platform.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted">
          <li>Developed robust backend systems using Node.js and specialized in API integrations.</li>
          <li>Grew the engineering team from 2 to 10 members, establishing core engineering principles.</li>
        </ul>
      </>
    )
  },
  {
    id: "state-ministry",
    role: "IT Specialist",
    company: "State Ministry of Information",
    date: "2019 - 2021",
    description: (
      <>
        <p>
          Managed and maintained internal IT infrastructure, supporting over 200 civil servants.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted">
          <li>Implemented new security protocols that reduced internal vulnerabilities by 40%.</li>
          <li>Digitized archaic record systems into a centralized, searchable database.</li>
        </ul>
      </>
    )
  }
];

export default function Experience() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8 border-b border-border pb-4">
        <GitBranch size={24} className="text-muted" />
        <h1 className="text-2xl font-semibold text-foreground">Commit History</h1>
      </div>
      
      <div className="bg-background rounded-xl">
        <TimelineBranch items={experienceItems} />
      </div>
    </div>
  );
}
