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
  UserCheck,
  Shield,
  Inbox,
  ChevronDown,
} from "lucide-react";
import { CrmFeedbackProvider } from "./CrmFeedbackProvider";
import { CrmProfileModal } from "./CrmProfileModal";

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
  Inbox,
  MessageCircle,
  Activity,
  Receipt,
  Wallet,
  Settings,
  Shield,
  UserCheck,
} as const;

export type CrmNavLinkInput = {
  name: string;
  href: string;
  icon: keyof typeof ICONS;
  count?: number | null;
};

export type CrmNavGroup = {
  title: string;
  icon?: typeof LayoutDashboard;
  links: NavLink[];
};

function NavList({ links, pathname, onNavigate }: { links: NavLink[]; pathname: string; onNavigate?: () => void }) {
  // Group definition according to user requirements:
  // 1. Standalone: Dashboard
  // 2. Contacts & Growth: Leads, Clients, Journeys, Import
  // 3. Communications: Mailbox, Campaigns, WhatsApp
  // 4. Invoices & Finance: Invoices, Finance
  // 5. System & Team: Monitoring, Team Users, Settings
  const dashboardLink = links.find((l) => l.href === "/crm");

  const groups: {
    id: string;
    title: string;
    icon: any;
    links: NavLink[];
  }[] = [
    {
      id: "contacts",
      title: "Contacts",
      icon: Users,
      links: links.filter((l) => ["/crm/leads", "/crm/clients", "/crm/journeys", "/crm/import"].includes(l.href)),
    },
    {
      id: "communications",
      title: "Communications",
      icon: Mail,
      links: links.filter((l) => ["/crm/mailbox", "/crm/campaigns", "/crm/whatsapp"].includes(l.href)),
    },
    {
      id: "finance",
      title: "Finance",
      icon: Receipt,
      links: links.filter((l) => ["/crm/invoices", "/crm/finance"].includes(l.href)),
    },
    {
      id: "system",
      title: "System",
      icon: Shield,
      links: links.filter((l) => ["/crm/monitoring", "/crm/users", "/crm/settings"].includes(l.href)),
    },
  ];

  // Helper to determine if a group contains active path
  const isGroupActive = (grp: (typeof groups)[0]) =>
    grp.links.some(
      (link) => pathname === link.href || (link.href !== "/crm" && pathname.startsWith(link.href))
    );

  // Accordion state: by default, auto-expand any group that has active route, or all by default
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <nav className="flex flex-col gap-2">
      {/* 1. Dashboard standalone link */}
      {dashboardLink && (
        <div>
          <Link
            href={dashboardLink.href}
            onClick={onNavigate}
            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
              pathname === "/crm"
                ? "bg-accent-blue/15 text-foreground font-semibold"
                : "text-muted hover:text-foreground hover:bg-accent-blue/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <dashboardLink.icon size={16} />
              {dashboardLink.name}
            </div>
            {!!dashboardLink.count && (
              <span className="px-1.5 py-0.5 rounded-full bg-accent-blue text-white text-[10px] font-bold">
                {dashboardLink.count}
              </span>
            )}
          </Link>
        </div>
      )}

      {/* 2. Grouped Dropdowns */}
      {groups
        .filter((g) => g.links.length > 0)
        .map((group) => {
          const active = isGroupActive(group);
          const isCollapsed = collapsedGroups[group.id] ?? false;
          const totalBadgeCount = group.links.reduce((acc, curr) => acc + (curr.count || 0), 0);
          const GroupIcon = group.icon;

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Dropdown Header Trigger */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors group select-none ${
                  active
                    ? "text-foreground bg-header/40"
                    : "text-muted hover:text-foreground hover:bg-header/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <GroupIcon size={14} className={active ? "text-accent-blue" : "text-muted group-hover:text-foreground"} />
                  <span>{group.title}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {totalBadgeCount > 0 && isCollapsed && (
                    <span className="px-1.5 py-0.2 rounded-full bg-accent-blue text-white text-[9px] font-bold">
                      {totalBadgeCount}
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 text-muted group-hover:text-foreground ${
                      isCollapsed ? "-rotate-90" : "rotate-0"
                    }`}
                  />
                </div>
              </button>

              {/* Dropdown Items */}
              {!isCollapsed && (
                <div className="pl-3 pr-1 pt-0.5 space-y-0.5 border-l border-border/50 ml-3">
                  {group.links.map((link) => {
                    const isLinkActive =
                      pathname === link.href || (link.href !== "/crm" && pathname.startsWith(link.href));
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        onClick={onNavigate}
                        className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                          isLinkActive
                            ? "bg-accent-blue/15 text-foreground font-semibold"
                            : "text-muted hover:text-foreground hover:bg-accent-blue/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <link.icon size={14} className={isLinkActive ? "text-accent-blue" : ""} />
                          <span>{link.name}</span>
                        </div>
                        {!!link.count && (
                          <span className="px-1.5 py-0.2 rounded-full bg-accent-blue text-white text-[9px] font-bold">
                            {link.count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </nav>
  );
}

export function CrmShell({
  navLinks,
  adminEmail,
  isSuperAdmin = true,
  permissions,
  displayName = "Team Member",
  roleTitle = "Assistant",
  activeAgreementId = null,
  agreementStatus = "pending",
  logoutAction,
  children,
}: {
  navLinks: CrmNavLinkInput[];
  adminEmail: string;
  isSuperAdmin?: boolean;
  permissions?: import("@/lib/crm/types").CrmPermissionsConfig;
  displayName?: string;
  roleTitle?: string;
  activeAgreementId?: string | null;
  agreementStatus?: "pending" | "signed" | "revoked";
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/crm";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const links: NavLink[] = navLinks.map((l) => ({ ...l, icon: ICONS[l.icon] }));

  return (
    <CrmFeedbackProvider permissions={permissions} isSuperAdmin={isSuperAdmin}>
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-header/50 sticky top-0 z-40">
        <Link href="/crm" className="font-semibold text-sm tracking-wide">
          CRM
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            className="p-1.5 text-xs text-muted hover:text-foreground flex items-center gap-1"
          >
            <UserCheck size={16} />
          </button>
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="p-2 -mr-2 text-muted hover:text-foreground"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 w-full">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-60 shrink-0 border-r border-border bg-header/30 min-h-screen sticky top-0 self-start">
          <div className="p-4 flex-1">
            <Link href="/crm" className="font-semibold text-base tracking-wide px-3 block mb-4 flex items-center gap-2 text-foreground hover:text-accent-blue transition-colors">
              <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
              <span>CRM</span>
            </Link>
            <NavList links={links} pathname={pathname} />
          </div>
        </aside>

        {/* Profile Modal */}
        <CrmProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          userEmail={adminEmail}
          displayName={displayName}
          roleTitle={roleTitle}
          agreementId={activeAgreementId}
          agreementStatus={agreementStatus}
        />

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
                {isSuperAdmin && (
                  <Link
                    href="/manage"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-muted hover:text-foreground hover:bg-header/60 rounded-lg transition-colors mb-1"
                  >
                    <ArrowLeftCircle size={15} />
                    <span>Back to /manage</span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setProfileOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-header/50 transition-colors my-1 flex items-center justify-between"
                >
                  <div className="truncate">
                    <span className="text-xs font-semibold text-foreground block truncate">{displayName}</span>
                    <span className="text-[10px] text-muted truncate block">{adminEmail}</span>
                  </div>
                  <span className="text-[9px] text-accent-blue bg-accent-blue/15 px-1.5 py-0.5 rounded capitalize">
                    {roleTitle}
                  </span>
                </button>
                <form action={logoutAction}>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors text-left mt-1">
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area with Desktop Top Header */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Top Header Bar */}
          <header className="hidden md:flex items-center justify-between px-6 py-2.5 border-b border-border bg-header/20 sticky top-0 z-30 backdrop-blur-md">
            {/* Breadcrumb / Current Path Indicator */}
            <div className="flex items-center gap-2 text-xs text-muted">
              <Link href="/crm" className="hover:text-foreground transition-colors font-medium">
                CRM
              </Link>
              {pathname !== "/crm" && (
                <>
                  <span>/</span>
                  <span className="text-foreground font-semibold capitalize">
                    {pathname.replace("/crm/", "").split("/")[0]}
                  </span>
                </>
              )}
            </div>

            {/* Right Top Header Actions */}
            <div className="flex items-center gap-2.5">
              {isSuperAdmin && (
                <Link
                  href="/manage"
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted hover:text-foreground hover:bg-header/60 border border-border/70 rounded-lg transition-colors"
                  title="Switch to website content management"
                >
                  <ArrowLeftCircle size={14} className="text-accent-blue" />
                  <span>Back to /manage</span>
                </Link>
              )}

              {/* User Profile Pill */}
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-border/70 hover:border-accent-blue/50 bg-header/40 hover:bg-header/60 transition-all group text-left"
                title="View team profile and agreements"
              >
                <div className="w-6 h-6 rounded-full bg-accent-blue/20 text-accent-blue border border-accent-blue/30 flex items-center justify-center text-xs font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-foreground group-hover:text-accent-blue transition-colors max-w-[130px] truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted truncate max-w-[130px]">
                    {adminEmail}
                  </span>
                </div>
                <span className="text-[9px] text-accent-blue bg-accent-blue/15 px-1.5 py-0.5 rounded font-medium capitalize ml-0.5">
                  {roleTitle}
                </span>
              </button>

              {/* Sign Out Action Button */}
              <form action={logoutAction} className="inline-flex">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-red-500/20 rounded-lg transition-colors"
                  title="Sign out of CRM"
                >
                  <LogOut size={13} />
                  <span className="hidden lg:inline">Sign out</span>
                </button>
              </form>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
    </CrmFeedbackProvider>
  );
}
