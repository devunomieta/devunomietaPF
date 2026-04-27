"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FolderGit2, History, GitPullRequest, Book, User, X, FileText, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type Route = {
  name: string;
  path: string;
  icon: React.ElementType;
  shortcut: string;
};

const routes: Route[] = [
  { name: "Home (README.md)", path: "/", icon: User, shortcut: "H" },
  { name: "Experience (Commit History)", path: "/experience", icon: History, shortcut: "E" },
  { name: "Projects (Repositories)", path: "/projects", icon: FolderGit2, shortcut: "P" },
  { name: "Academic & Research (Wiki)", path: "/academic", icon: Book, shortcut: "A" },
  { name: "Blog (Discussions)", path: "/blog", icon: FileText, shortcut: "B" },
  { name: "Contact (Issues)", path: "/contact", icon: Mail, shortcut: "C" },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    
    const openPalette = () => setIsOpen(true);

    document.addEventListener("keydown", down);
    window.addEventListener("open-command-palette", openPalette);
    
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", openPalette);
    };
  }, []);

  const filteredRoutes = routes.filter((route) =>
    route.name.toLowerCase().includes(search.toLowerCase())
  );

  const navigateTo = (path: string) => {
    setIsOpen(false);
    setSearch("");
    router.push(path);
  };

  // Hydration safety
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col glow"
            >
              <div className="flex items-center px-4 border-b border-border">
                <Search size={18} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search or jump to..."
                  className="w-full bg-transparent border-none text-foreground px-4 py-4 outline-none placeholder:text-muted"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                <button onClick={() => setIsOpen(false)} className="text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto py-2">
                {filteredRoutes.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted text-sm">
                    No results found.
                  </div>
                ) : (
                  <ul className="px-2">
                    {filteredRoutes.map((route) => (
                      <li key={route.path}>
                        <button
                          onClick={() => navigateTo(route.path)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent-blue/10 hover:text-accent-blue text-left transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <route.icon size={16} className="text-muted group-hover:text-accent-blue" />
                            <span className="text-sm font-medium text-foreground">{route.name}</span>
                          </div>
                          <kbd className="border border-border rounded px-1.5 font-mono text-[10px] text-muted group-hover:text-accent-blue group-hover:border-accent-blue/50">
                            {route.shortcut}
                          </kbd>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
  );
}
