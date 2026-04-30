export interface PostIdea {
  id: string;
  title: string;
  description: string;
  category: 'SDLC' | 'Security' | 'Development' | 'Tools' | 'Tips & Tricks' | 'Controversial';
  impact: 'High' | 'Medium' | 'Low';
  insight?: string;
  conventionalAngle?: string;
  controversialAngle?: string;
}

export const ideaPool: PostIdea[] = [
  {
    id: '1',
    title: 'Why "Shift Left" Security is Failing Your Team',
    description: 'Debunking the myth that developers can handle all security tasks without proper tooling or dedicated experts.',
    category: 'Security',
    impact: 'High',
    insight: 'The "Shift Left" movement assumes developers can become security experts overnight. In reality, without specialized tools and clear ownership, it just leads to burnout and missed vulnerabilities.',
    conventionalAngle: 'Developers should be responsible for security from day one to reduce costs.',
    controversialAngle: 'Forcing security onto developers without providing a dedicated SecOps buffer is a recipe for disaster and systemic failure.',
  },
  {
    id: '2',
    title: 'The Hidden Cost of Micro-frontends',
    description: 'When and why you should probably stick to a monolith (and how to know when you have outgrown it).',
    category: 'SDLC',
    impact: 'Medium',
    insight: 'Micro-frontends introduce massive complexity in orchestration, versioning, and shared dependencies. Often, the organizational silos they create are worse than the monolith they replaced.',
    conventionalAngle: 'Micro-frontends allow teams to scale independently and use different tech stacks.',
    controversialAngle: 'Most teams using micro-frontends are just trying to solve a people problem with a complex technical architecture they cannot maintain.',
  },
  {
    id: '3',
    title: 'Mastering React Server Components in 2026',
    description: 'Advanced patterns for data fetching and state management in the modern Next.js ecosystem.',
    category: 'Development',
    impact: 'High',
    insight: 'RSCs are not just "server-side rendering." They represent a fundamental shift in how we think about the boundary between client and server.',
    conventionalAngle: 'Use RSCs to improve performance by reducing client-side JavaScript.',
    controversialAngle: 'RSCs make the mental model of React unnecessarily complex and are often a premature optimization for most CRUD apps.',
  },
  {
    id: '4',
    title: 'Bun vs Node: The Performance Benchmarks No One Tells You',
    description: 'A deep dive into real-world production workloads beyond simple hello-world tests.',
    category: 'Tools',
    impact: 'Medium',
    insight: 'While Bun is faster in raw I/O, Node.js stability and ecosystem maturity still make it the better choice for enterprise-grade applications.',
    conventionalAngle: 'Bun is the future because it is significantly faster and has a built-in bundler/test runner.',
    controversialAngle: 'The performance gains of Bun are negligible for 99% of web applications where the database is the real bottleneck.',
  },
  {
    id: '5',
    title: '10 Refactoring Patterns to Save Your Legacy Codebase',
    description: 'Practical steps to clean up "spaghetti code" without breaking everything.',
    category: 'Tips & Tricks',
    impact: 'High',
    insight: 'Refactoring should be a continuous process, not a "big bang" rewrite. Focusing on small, testable changes is the only way to modernize legacy systems.',
    conventionalAngle: 'Rewrite legacy code in a modern framework to fix technical debt.',
    controversialAngle: 'Rewrites are a trap. You should only refactor the code that is actually changing, and leave the rest of the "ugly but working" code alone.',
  },
  {
    id: '6',
    title: 'Stop Using JWT for Sessions (And What to Use Instead)',
    description: 'A controversial take on session management and why traditional cookies are still king.',
    category: 'Controversial',
    impact: 'High',
    insight: 'JWTs are stateless, which means you cannot revoke them without a blacklist—defeating the purpose. Stateful sessions with HttpOnly cookies are more secure and easier to manage.',
    conventionalAngle: 'JWTs are the industry standard for scalable, stateless authentication.',
    controversialAngle: 'JWTs for sessions are an anti-pattern. They were designed for API tokens, not for browser-based session management.',
  },
  {
    id: '7',
    title: 'The "Clean Code" Trap',
    description: 'How over-engineering for "cleanliness" can actually hurt maintainability and speed.',
    category: 'Controversial',
    impact: 'High',
    insight: 'DRY and SOLID are often used to justify layers of abstraction that make code impossible to follow. Sometimes, duplication is better than the wrong abstraction.',
    conventionalAngle: 'Always follow SOLID principles and DRY to ensure code is maintainable.',
    controversialAngle: '"Clean Code" is often just a way for developers to feel smart while shipping slower and creating more bugs through over-abstraction.',
  },
  {
    id: '8',
    title: 'Implementing Zero-Trust Architecture in Web Apps',
    description: 'Moving beyond firewalls to a more robust security posture for modern cloud-native apps.',
    category: 'Security',
    impact: 'High',
  },
  {
    id: '9',
    title: 'AI Coding Assistants: Friend or Foe?',
    description: 'How to leverage AI without losing your edge as a senior engineer.',
    category: 'Tools',
    impact: 'Medium',
  },
  {
    id: '10',
    title: 'The Future of WebAssembly (Wasm)',
    description: 'Exploring how Wasm is moving beyond the browser and into the server-side.',
    category: 'Development',
    impact: 'Medium',
  },
  {
    id: '11',
    title: 'TRPC vs GraphQL: Choosing the Right Tool',
    description: 'A comparison of type-safe API communication layers for TypeScript developers.',
    category: 'Tools',
    impact: 'Medium',
  },
  {
    id: '12',
    title: 'Agile is Not a Process, It is a Culture',
    description: 'Why your "Agile" transformation is likely just Waterfall in disguise.',
    category: 'SDLC',
    impact: 'High',
  },
  {
    id: '13',
    title: 'The Death of the SPA?',
    description: 'Why MPA-first frameworks like Astro and Remix are gaining massive traction.',
    category: 'Development',
    impact: 'High',
  },
  {
    id: '14',
    title: 'Securing Your CI/CD Pipeline',
    description: 'Common vulnerabilities in automated workflows and how to patch them.',
    category: 'Security',
    impact: 'High',
  },
  {
    id: '15',
    title: 'Pragmatic Performance Optimization',
    description: 'Stop micro-optimizing loops and start focusing on what actually matters to the user.',
    category: 'Tips & Tricks',
    impact: 'Medium',
  },
  {
    id: '16',
    title: 'Why I am Moving Back to SQL from NoSQL',
    description: 'The lessons learned from the document store hype and why relational DBs are winning again.',
    category: 'Controversial',
    impact: 'High',
  },
  {
    id: '17',
    title: 'Testing in Production: Why You Should Do It',
    description: 'Safe strategies for observability and feature flagging in live environments.',
    category: 'SDLC',
    impact: 'Medium',
  },
  {
    id: '18',
    title: 'The Best VS Code Extensions for Web Dev in 2026',
    description: 'A curated list of productivity boosters you might have missed.',
    category: 'Tools',
    impact: 'Low',
  },
  {
    id: '19',
    title: 'Understanding CSS Container Queries',
    description: 'How to build truly component-driven layouts without relying on viewport media queries.',
    category: 'Development',
    impact: 'Medium',
  },
  {
    id: '20',
    title: 'Effective Code Reviews: Beyond Nitpicking',
    description: 'How to give feedback that actually improves code quality and team morale.',
    category: 'Tips & Tricks',
    impact: 'Medium',
  },
  {
    id: '21',
    title: 'Why Unit Testing is Often a Waste of Time',
    description: 'A provocative look at why integration tests provide more value for modern web applications.',
    category: 'Controversial',
    impact: 'High',
  },
  {
    id: '22',
    title: 'The Myth of the "10x Developer"',
    description: 'Debunking the lone-wolf genius trope and highlighting why communication beats raw coding skill.',
    category: 'Controversial',
    impact: 'Medium',
  },
  {
    id: '23',
    title: 'Tailwind CSS is a Step Backwards',
    description: 'Why utility-first CSS might be hurting your long-term maintainability and design consistency.',
    category: 'Controversial',
    impact: 'High',
  },
  {
    id: '24',
    title: 'Serverless is Overpriced for Most Startups',
    description: 'Calculating the real cost of AWS Lambda vs a simple VPS for steady workloads.',
    category: 'Controversial',
    impact: 'Medium',
  }
];

export function getDailyIdeas(count: number = 10): PostIdea[] {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Simple seed based on date to keep it consistent for the day
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed += dateString.charCodeAt(i);
  }

  const shuffled = [...ideaPool].sort(() => {
    seed = (seed * 9301 + 49297) % 233280;
    return 0.5 - (seed / 233280);
  });

  return shuffled.slice(0, count);
}
