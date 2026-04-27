"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FolderGit2, History, Book, User, X, FileText, Mail, MessageSquare } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type SearchItem = {
  name: string;
  path: string;
  icon: any;
  type: "page" | "post";
  subtitle?: string;
};

const staticRoutes: SearchItem[] = [
  { name: "Home (README.md)", path: "/", icon: User, type: "page" },
  { name: "Experience (Commit History)", path: "/experience", icon: History, type: "page" },
  { name: "Projects (Repositories)", path: "/projects", icon: FolderGit2, type: "page" },
  { name: "Academic & Research (Wiki)", path: "/academic", icon: Book, type: "page" },
  { name: "Blog (Discussions)", path: "/blog", icon: FileText, type: "page" },
  { name: "Contact (Issues)", path: "/contact", icon: Mail, type: "page" },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<SearchItem[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("posts")
        .select("title, slug, excerpt")
        .eq("status", "published")
        .limit(10);

      if (data) {
        const postItems: SearchItem[] = data.map((p) => ({
          name: p.title,
          path: `/blog/${p.slug}`,
          icon: MessageSquare,
          type: "post",
          subtitle: p.excerpt
        }));
        setPosts(postItems);
      }
    };

    fetchPosts();
  }, [supabase]);

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

  const allItems = [...staticRoutes, ...posts];
  const filteredItems = allItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.subtitle && item.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  const navigateTo = (path: string) => {
    setIsOpen(false);
    setSearch("");
    router.push(path);
  };

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
                  placeholder="Search pages or blog posts..."
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
                {filteredItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted text-sm">
                    No results found.
                  </div>
                ) : (
                  <ul className="px-2">
                    {filteredItems.map((item, idx) => (
                      <li key={`${item.path}-${idx}`}>
                        <button
                          onClick={() => navigateTo(item.path)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent-blue/10 hover:text-accent-blue text-left transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <item.icon size={16} className="text-muted group-hover:text-accent-blue" />
                            <div>
                                <span className="text-sm font-medium text-foreground block">{item.name}</span>
                                {item.subtitle && (
                                    <span className="text-[10px] text-muted truncate max-w-[300px] block">{item.subtitle}</span>
                                )}
                            </div>
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-muted/50 font-bold group-hover:text-accent-blue/50">
                            {item.type}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-2 border-t border-border bg-header/20 flex items-center justify-center gap-4 text-[10px] text-muted">
                <span><kbd className="border border-border px-1 rounded">↵</kbd> Select</span>
                <span><kbd className="border border-border px-1 rounded">esc</kbd> Close</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
  );
}
