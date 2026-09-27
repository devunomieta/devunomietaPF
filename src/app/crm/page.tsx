import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Users, UserPlus, Receipt, Activity } from "lucide-react";
import { getTodaysSentEmailCount } from "@/lib/crm/jobs";

export const metadata = { title: "Dashboard · CRM" };

export default async function CrmDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalClients },
    { count: openLeads },
    { count: overdueInvoices },
    { count: pendingJobs },
    { data: settings },
    sentToday,
  ] = await Promise.all([
    supabase.from("crm_clients").select("*", { count: "exact", head: true }),
    supabase.from("crm_leads").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("crm_invoices").select("*", { count: "exact", head: true }).eq("status", "overdue"),
    supabase.from("crm_jobs").select("*", { count: "exact", head: true }).in("status", ["queued", "processing"]),
    supabase.from("crm_settings").select("brevo_daily_cap").eq("id", "default").maybeSingle(),
    getTodaysSentEmailCount(supabase),
  ]);

  const dailyCap = settings?.brevo_daily_cap ?? 300;

  const cards = [
    { label: "Clients", value: totalClients || 0, href: "/crm/clients", icon: Users },
    { label: "Open leads", value: openLeads || 0, href: "/crm/leads", icon: UserPlus },
    { label: "Overdue invoices", value: overdueInvoices || 0, href: "/crm/invoices", icon: Receipt, warn: (overdueInvoices || 0) > 0 },
    { label: "Jobs pending", value: pendingJobs || 0, href: "/crm/monitoring", icon: Activity },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted">A quick read on clients, leads, invoices, and mail health.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="bg-header/20 border border-border rounded-xl p-4 hover:border-accent-blue/50 transition-colors">
            <c.icon size={18} className="text-muted mb-2" />
            <p className={`text-2xl font-bold ${c.warn ? "text-red-400" : "text-foreground"}`}>{c.value}</p>
            <p className="text-xs text-muted">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-header/20 border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Today&apos;s email sends</h2>
          <span className="text-sm text-muted">{sentToday} / {dailyCap}</span>
        </div>
        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full ${sentToday / dailyCap > 0.9 ? "bg-red-400" : "bg-accent-blue"}`}
            style={{ width: `${Math.min(100, (sentToday / dailyCap) * 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/crm/import" className="bg-header/20 border border-border rounded-xl p-4 hover:border-accent-blue/50 transition-colors">
          <p className="text-sm font-semibold text-foreground">Import clients or leads</p>
          <p className="text-xs text-muted mt-1">Upload a spreadsheet, map columns, and commit.</p>
        </Link>
        <Link href="/crm/campaigns/new" className="bg-header/20 border border-border rounded-xl p-4 hover:border-accent-blue/50 transition-colors">
          <p className="text-sm font-semibold text-foreground">Send a campaign</p>
          <p className="text-xs text-muted mt-1">Single email, or a filtered bulk send.</p>
        </Link>
      </div>
    </div>
  );
}
