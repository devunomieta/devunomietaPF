import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logout } from "@/app/login/actions";
import { CrmShell, type CrmNavLinkInput } from "@/components/crm/CrmShell";
import { ConsentGateModal } from "@/components/crm/ConsentGateModal";

export const metadata = {
  title: "CRM",
  robots: { index: false, follow: false },
};

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userEmail = user.email?.toLowerCase() ?? "";

  const { getCrmAuthUser } = await import("@/lib/crm/auth");
  const authUser = await getCrmAuthUser();

  if (!authUser) {
    await supabase.auth.signOut();
    redirect(`/login?error=Access+denied.+${encodeURIComponent(userEmail)}+is+not+an+authorized+CRM+user.`);
  }

  const [
    { count: openLeads },
    { count: overdueInvoices },
    { count: pendingJobs },
    { count: unreadThreads },
  ] = await Promise.all([
    supabase.from("crm_leads").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("crm_invoices").select("*", { count: "exact", head: true }).eq("status", "overdue"),
    supabase.from("crm_jobs").select("*", { count: "exact", head: true }).in("status", ["queued", "processing"]),
    supabase.from("crm_threads").select("*", { count: "exact", head: true }).gt("unread_count", 0).eq("folder", "inbox"),
  ]);

  const allNavLinks: (CrmNavLinkInput & { permissionKey: keyof typeof authUser.permissions.pages })[] = [
    { name: "Dashboard", href: "/crm", icon: "LayoutDashboard", permissionKey: "dashboard" },
    { name: "Mailbox", href: "/crm/mailbox", icon: "Inbox", count: unreadThreads, permissionKey: "mailbox" },
    { name: "Clients", href: "/crm/clients", icon: "Users", permissionKey: "clients" },
    { name: "Leads", href: "/crm/leads", icon: "UserPlus", count: openLeads, permissionKey: "leads" },
    { name: "Journeys", href: "/crm/journeys", icon: "GitBranch", permissionKey: "journeys" },
    { name: "Import", href: "/crm/import", icon: "UploadCloud", permissionKey: "import" },
    { name: "Campaigns", href: "/crm/campaigns", icon: "Mail", permissionKey: "campaigns" },
    { name: "WhatsApp", href: "/crm/whatsapp", icon: "MessageCircle", permissionKey: "whatsapp" },
    { name: "Monitoring", href: "/crm/monitoring", icon: "Activity", count: pendingJobs, permissionKey: "monitoring" },
    { name: "Notifications", href: "/crm/notifications", icon: "Bell", permissionKey: "notifications" },
    { name: "Invoices", href: "/crm/invoices", icon: "Receipt", count: overdueInvoices, permissionKey: "invoices" },
    { name: "Finance", href: "/crm/finance", icon: "Wallet", permissionKey: "finance" },
    { name: "Settings", href: "/crm/settings", icon: "Settings", permissionKey: "settings" },
    { name: "Team Users", href: "/crm/users", icon: "Shield", permissionKey: "users" },
  ];

  const filteredNavLinks = allNavLinks.filter((l) => authUser.permissions.pages[l.permissionKey]);

  const requiresConsent = !authUser.isSuperAdmin && authUser.agreementStatus !== "signed";

  // Fetch agreement ID for signed download
  let activeAgreementId: string | null = null;
  if (authUser.crmUserId) {
    const adminDb = createAdminClient();
    const { data: agr } = await adminDb
      .from("crm_team_agreements")
      .select("id")
      .eq("user_id", authUser.crmUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    activeAgreementId = agr?.id || null;
  }

  return (
    <>
      {requiresConsent && (
        <ConsentGateModal
          defaultDisplayName={authUser.displayName}
          roleTitle={authUser.roleTitle}
        />
      )}
      <CrmShell
        navLinks={filteredNavLinks}
        adminEmail={userEmail}
        isSuperAdmin={authUser.isSuperAdmin}
        permissions={authUser.permissions}
        displayName={authUser.displayName}
        roleTitle={authUser.roleTitle}
        agreementStatus={authUser.agreementStatus}
        activeAgreementId={activeAgreementId}
        logoutAction={logout}
      >
        {children}
      </CrmShell>
    </>
  );
}
