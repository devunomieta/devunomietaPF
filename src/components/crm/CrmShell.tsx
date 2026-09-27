"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  GitBranch,
  UploadCloud,
  Mail,
  MessageCircle,
  Activity,
  Receipt,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeftCircle,
} from "lucide-react";
import { CrmFeedbackProvider } from "./CrmFeedbackProvider";

type NavLink = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  count?: number | null;
};

const ICONS = {
  LayoutDashboard,
  Users,
  UserPlus,
  GitBranch,
  UploadCloud,
  Mail,
  MessageCircle,
  Activity,
  Receipt,
  Wallet,
  Settings,
} as const;

export type CrmNavLinkInput = {
  name: string;
  href: string;
  icon: keyof typeof ICONS;
  count?: number | null;
};

function NavList({ links, pathname, onNavigate }: { links: NavLink[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== "/crm" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onNavigate}
            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
              active
                ? "bg-accent-blue/15 text-foreground"
                : "text-muted hover:text-foreground hover:bg-accent-blue/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <link.icon size={16} />
              {link.name}
            </div>
            {!!link.count && (
              <span className="px-1.5 py-0.5 rounded-full bg-accent-blue text-white text-[10px] font-bold">
                {link.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function CrmShell({
  navLinks,
  adminEmail,
  logoutAction,
  children,
}: {
  navLinks: CrmNavLinkInput[];
  adminEmail: string;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/crm";
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: NavLink[] = navLinks.map((l) => ({ ...l, icon: ICONS[l.icon] }));

  return (
    <CrmFeedbackProvider>
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-header/50 sticky top-0 z-40">
        <Link href="/crm" className="font-semibold text-sm tracking-wide">
          CRM
        </Link>
        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-2 text-muted hover:text-foreground"
        >
          <Menu size={22} />
        </button>
      </div>

      <div className="flex flex-1 w-full">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-60 shrink-0 border-r border-border bg-header/30 min-h-screen sticky top-0 self-start">
          <div className="p-4">
            <Link href="/crm" className="font-semibold text-base tracking-wide px-3 block mb-4">
              CRM
            </Link>
            <NavList links={links} pathname={pathname} />
          </div>
          <div className="mt-auto p-4 border-t border-border">
            <Link
              href="/manage"
              className="flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-accent-blue/10 rounded-md transition-colors mb-1"
            >
              <ArrowLeftCircle size={16} />
              Back to /manage
            </Link>
            <p className="px-3 text-xs text-muted truncate mb-2 mt-2">{adminEmail}</p>
            <form action={logoutAction}>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors text-left">
                <LogOut size={16} />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-header border-r border-border h-full p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-base tracking-wide px-3">CRM</span>
                <button
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-muted hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
              <NavList links={links} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto pt-4 border-t border-border">
                <Link
                  href="/manage"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-accent-blue/10 rounded-md transition-colors mb-1"
                >
                  <ArrowLeftCircle size={16} />
                  Back to /manage
                </Link>
                <p className="px-3 text-xs text-muted truncate mb-2 mt-2">{adminEmail}</p>
                <form action={logoutAction}>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors text-left">
                    <LogOut size={16} />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
    </CrmFeedbackProvider>
  );
}
