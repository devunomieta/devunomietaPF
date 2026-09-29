"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderGit2,
  History,
  GraduationCap,
  User,
  MessageSquare,
  LogOut,
  Send,
  Settings,
  Lightbulb,
  ArrowUpRight,
  Globe,
  Menu,
  X,
} from "lucide-react";

export type AdminNavLink = {
  name: string;
  href: string;
  iconName: string;
  count?: number | null;
};

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileText,
  FolderGit2,
  History,
  GraduationCap,
  User,
  MessageSquare,
  Send,
  Settings,
  Lightbulb,
};

function NavList({
  links,
  pathname,
  onNavigate,
}: {
  links: AdminNavLink[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const IconComponent = ICONS[link.iconName] || LayoutDashboard;
        const active =
          link.href === "/manage"
            ? pathname === "/manage"
            : pathname === link.href || pathname.startsWith(link.href + "/");

        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onNavigate}
            className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
              active
                ? "bg-accent-blue/15 text-foreground font-medium"
                : "text-muted hover:text-foreground hover:bg-accent-blue/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <IconComponent size={16} />
              {link.name}
            </div>
            {link.count !== undefined && link.count !== null && link.count > 0 && (
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

export function ManageShell({
  navLinks,
  userEmail,
  logoutAction,
  children,
}: {
  navLinks: AdminNavLink[];
  userEmail: string;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/manage";
  const [mobileOpen, setMobileOpen] = useState(false);

  // Active page name for mobile header
  const currentLink = navLinks.find((l) =>
    l.href === "/manage" ? pathname === "/manage" : pathname.startsWith(l.href)
  );
  const pageTitle = currentLink ? currentLink.name : "Admin";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Mobile Top App Bar */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-header/70 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-muted hover:text-foreground rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm tracking-wide text-foreground">
            {pageTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border border-border bg-header/50 text-muted hover:text-foreground transition-colors"
          >
            <Globe size={13} />
            <span>Live Site</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 shrink-0">
          <div className="bg-header/50 border border-border rounded-xl p-4 sticky top-6 flex flex-col min-h-[calc(100vh-3rem)]">
            <div className="flex items-center justify-between mb-4 px-3">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Admin Panel
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 bg-accent-blue/15 text-accent-blue rounded font-mono font-medium">
                v2.0
              </span>
            </div>

            <NavList links={navLinks} pathname={pathname} />

            <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-border">
              <Link
                href="/crm"
                className="flex items-center justify-between px-3 py-2 text-sm text-accent-blue hover:bg-accent-blue/10 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ArrowUpRight size={16} />
                  CRM Portal
                </div>
              </Link>

              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-white/5 rounded-md transition-colors"
              >
                <Globe size={16} />
                View Live Site
              </Link>

              <div className="my-1 border-t border-border" />

              <p className="px-3 text-xs text-muted truncate py-1 font-mono">
                {userEmail}
              </p>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors text-left"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 bg-background border border-border rounded-xl p-5 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-header border-r border-border h-full p-4 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <span className="font-semibold text-sm tracking-wide text-foreground">
                  Admin Panel
                </span>
                <p className="text-[11px] text-muted truncate max-w-[180px]">
                  {userEmail}
                </p>
              </div>
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              <NavList
                links={navLinks}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>

            <div className="mt-auto pt-3 border-t border-border flex flex-col gap-1">
              <Link
                href="/crm"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-accent-blue hover:bg-accent-blue/10 rounded-md transition-colors"
              >
                <ArrowUpRight size={16} />
                CRM Portal
              </Link>
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-white/5 rounded-md transition-colors"
              >
                <Globe size={16} />
                View Live Site
              </Link>
              <form action={logoutAction} className="mt-1">
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors text-left"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
