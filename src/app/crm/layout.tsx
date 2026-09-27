import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logout } from "@/app/login/actions";
import { CrmShell, type CrmNavLinkInput } from "@/components/crm/CrmShell";

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

  const adminDb = createAdminClient();
  const { data: adminUser, error: adminQueryError } = await adminDb
    .from("admins")
    .select("email")
    .eq("email", userEmail)
    .maybeSingle();

  if (adminQueryError) {
    await supabase.auth.signOut();
    redirect(`/login?error=Admin+check+failed:+${encodeURIComponent(adminQueryError.message)}`);
  }

  if (!adminUser) {
    await supabase.auth.signOut();
    redirect(`/login?error=Access+denied.+${encodeURIComponent(userEmail)}+is+not+an+authorized+admin.`);
  }

  const [
    { count: openLeads },
    { count: overdueInvoices },
    { count: pendingJobs },
  ] = await Promise.all([
    supabase.from("crm_leads").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("crm_invoices").select("*", { count: "exact", head: true }).eq("status", "overdue"),
    supabase.from("crm_jobs").select("*", { count: "exact", head: true }).in("status", ["queued", "processing"]),
  ]);

  const navLinks: CrmNavLinkInput[] = [
    { name: "Dashboard", href: "/crm", icon: "LayoutDashboard" },
    { name: "Clients", href: "/crm/clients", icon: "Users" },
    { name: "Leads", href: "/crm/leads", icon: "UserPlus", count: openLeads },
    { name: "Journeys", href: "/crm/journeys", icon: "GitBranch" },
    { name: "Import", href: "/crm/import", icon: "UploadCloud" },
    { name: "Campaigns", href: "/crm/campaigns", icon: "Mail" },
    { name: "WhatsApp", href: "/crm/whatsapp", icon: "MessageCircle" },
    { name: "Monitoring", href: "/crm/monitoring", icon: "Activity", count: pendingJobs },
    { name: "Invoices", href: "/crm/invoices", icon: "Receipt", count: overdueInvoices },
    { name: "Finance", href: "/crm/finance", icon: "Wallet" },
    { name: "Settings", href: "/crm/settings", icon: "Settings" },
  ];

  return (
    <CrmShell navLinks={navLinks} adminEmail={userEmail} logoutAction={logout}>
      {children}
    </CrmShell>
  );
}
