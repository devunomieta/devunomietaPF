import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import {
  Users,
  UserPlus,
  Receipt,
  Activity,
  Mail,
  MessageCircle,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";
import { getTodaysSentEmailCount } from "@/lib/crm/jobs";
import { formatMoney } from "@/lib/crm/currency";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { CrmPageGuide } from "@/components/crm/CrmPageGuide";
import { CrmTooltip } from "@/components/crm/CrmTooltip";

export const metadata = { title: "Dashboard · CRM" };
export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  const supabase = await createClient();

  // 1. Fetch high-level counts and critical datasets in parallel
  const [
    { count: totalClients },
    { count: totalLeads },
    { count: openLeads },
    { count: overdueInvoices },
    { count: pendingJobs },
    { data: settings },
    sentToday,
    { data: leadsData },
    { data: defaultJourney },
    { data: invoiceRows },
    { data: paymentRows },
    { data: emailEvents },
    { count: totalCampaigns },
    { count: waEventsCount },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from("crm_clients").select("*", { count: "exact", head: true }),
    supabase.from("crm_leads").select("*", { count: "exact", head: true }),
    supabase.from("crm_leads").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("crm_invoices").select("*", { count: "exact", head: true }).eq("status", "overdue"),
    supabase.from("crm_jobs").select("*", { count: "exact", head: true }).in("status", ["queued", "processing"]),
    supabase.from("crm_settings").select("brevo_daily_cap").eq("id", "default").maybeSingle(),
    getTodaysSentEmailCount(supabase),
    supabase.from("crm_leads").select("id, status, current_stage_key, source, created_at"),
    supabase.from("crm_journeys").select("stages").eq("is_default", true).maybeSingle(),
    supabase.from("crm_invoices").select("id, total, status, currency, created_at").neq("status", "void"),
    supabase.from("crm_invoice_payments").select("id, amount, channel, paid_at"),
    supabase.from("crm_email_events").select("type, occurred_at"),
    supabase.from("crm_email_campaigns").select("*", { count: "exact", head: true }),
    supabase.from("crm_whatsapp_events").select("*", { count: "exact", head: true }),
    supabase.from("crm_leads").select("id, name, company, current_stage_key, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const dailyCap = settings?.brevo_daily_cap ?? 300;

  // --- Financial Computations ---
  const defaultCurrency = invoiceRows?.[0]?.currency || "NGN";
  const totalInvoiced = (invoiceRows || []).reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalCollected = (paymentRows || []).reduce((sum, pay) => sum + Number(pay.amount), 0);
  const collectionRate = totalInvoiced > 0 ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100)) : 0;

  // --- Lead Funnel / Stage Breakdown ---
  const stages: CrmJourneyStage[] = ((defaultJourney?.stages as CrmJourneyStage[] | undefined) || [
    { key: "lead", label: "Lead", position: 0, is_won: false, is_lost: false },
    { key: "contacted", label: "Contacted", position: 1, is_won: false, is_lost: false },
    { key: "qualified", label: "Qualified", position: 2, is_won: false, is_lost: false },
    { key: "proposal", label: "Proposal", position: 3, is_won: false, is_lost: false },
    { key: "won", label: "Client (won)", position: 4, is_won: true, is_lost: false },
    { key: "lost", label: "Lost", position: 5, is_won: false, is_lost: true },
  ]).sort((a, b) => a.position - b.position);

  const stageCountMap: Record<string, number> = {};
  for (const s of stages) stageCountMap[s.key] = 0;
  for (const l of leadsData || []) {
    const key = l.current_stage_key || "lead";
    stageCountMap[key] = (stageCountMap[key] || 0) + 1;
  }
  const maxStageCount = Math.max(1, ...Object.values(stageCountMap));

  // --- Lead Sources Breakdown ---
  const sourceCountMap: Record<string, number> = {};
  for (const l of leadsData || []) {
    const src = l.source ? l.source.charAt(0).toUpperCase() + l.source.slice(1) : "Direct / Manual";
    sourceCountMap[src] = (sourceCountMap[src] || 0) + 1;
  }
  const leadSourceList = Object.entries(sourceCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // --- Email Performance Metrics ---
  const emailCounts = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounce: 0 };
  for (const ev of emailEvents || []) {
    if (ev.type === "sent") emailCounts.sent++;
    else if (ev.type === "delivered") emailCounts.delivered++;
    else if (ev.type === "opened") emailCounts.opened++;
    else if (ev.type === "clicked") emailCounts.clicked++;
    else if (ev.type === "soft_bounce" || ev.type === "hard_bounce") emailCounts.bounce++;
  }

  // Calculate rates
  const baseDenominator = emailCounts.delivered || emailCounts.sent || 1;
  const deliveryPct = emailCounts.sent > 0 ? Math.min(100, Math.round((emailCounts.delivered / emailCounts.sent) * 100)) : 100;
  const openPct = Math.min(100, Math.round((emailCounts.opened / baseDenominator) * 100));
  const clickPct = Math.min(100, Math.round((emailCounts.clicked / baseDenominator) * 100));

  // --- Last 7 Days Activity (Email sends & Lead creations) ---
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trendDays: { label: string; dateStr: string; leads: number; emails: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    trendDays.push({
      label: days[d.getDay()],
      dateStr,
      leads: 0,
      emails: 0,
    });
  }

  for (const l of leadsData || []) {
    if (!l.created_at) continue;
    const lDate = l.created_at.slice(0, 10);
    const item = trendDays.find((t) => t.dateStr === lDate);
    if (item) item.leads++;
  }

  for (const e of emailEvents || []) {
    if (!e.occurred_at || e.type !== "sent") continue;
    const eDate = e.occurred_at.slice(0, 10);
    const item = trendDays.find((t) => t.dateStr === eDate);
    if (item) item.emails++;
  }

  const maxDailyVolume = Math.max(1, ...trendDays.map((t) => Math.max(t.leads, t.emails)));

  // Top KPI metrics
  const cards = [
    { label: "Active Clients", value: totalClients || 0, href: "/crm/clients", icon: Users, color: "text-accent-blue" },
    { label: "Open Leads", value: openLeads || 0, href: "/crm/leads", icon: UserPlus, color: "text-emerald-400" },
    {
      label: "Overdue Invoices",
      value: overdueInvoices || 0,
      href: "/crm/invoices",
      icon: Receipt,
      warn: (overdueInvoices || 0) > 0,
      color: (overdueInvoices || 0) > 0 ? "text-red-400" : "text-muted",
    },
    { label: "Pending Jobs", value: pendingJobs || 0, href: "/crm/monitoring", icon: Activity, color: "text-amber-400" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">CRM Analytics & Overview</h1>
          <p className="text-sm text-muted">Comprehensive snapshot of customer acquisition, communications, and financial performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Link
              href="/crm/campaigns/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/90 shadow-sm transition-colors"
            >
              <Send size={13} /> New Campaign
            </Link>
            <CrmTooltip text="Compose and schedule a new marketing or outreach email campaign." />
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/crm/invoices/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-header border border-border text-foreground hover:bg-header/80 transition-colors"
            >
              <CreditCard size={13} /> Create Invoice
            </Link>
            <CrmTooltip text="Generate a new billing invoice for an active client." />
          </div>
        </div>
      </div>

      <CrmPageGuide
        pageKey="dashboard"
        title="CRM Analytics & System Hub"
        description="This dashboard provides an executive overview of your customer pipelines, daily email deliverability, WhatsApp outreach volume, and cash collection performance."
        tips={[
          "Review collection efficiency to keep tabs on unpaid and overdue client accounts.",
          "Check the Daily Email Cap monitor before initiating massive email broadcasts.",
          "Use the quick action buttons above to quickly launch campaigns or generate invoices.",
        ]}
      />

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group relative bg-header/25 hover:bg-header/40 border border-border/80 hover:border-accent-blue/50 rounded-xl p-4 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <c.icon size={18} className={c.color} />
              <ArrowUpRight size={14} className="text-muted/40 group-hover:text-foreground transition-colors" />
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${c.warn ? "text-red-400" : "text-foreground"}`}>{c.value}</p>
            <p className="text-xs text-muted mt-0.5">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Row 2: Financial Pulse & Email Quota */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Financial Highlights */}
        <div className="lg:col-span-2 bg-header/20 border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-green" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Revenue & Cashflow</h2>
            </div>
            <Link href="/crm/finance" className="text-xs text-accent-blue hover:underline inline-flex items-center gap-1">
              View finance ledger <ChevronRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-background/40 border border-border/60 rounded-lg p-3">
              <span className="text-xs text-muted block mb-1">Total Invoiced</span>
              <span className="text-lg font-bold text-foreground">{formatMoney(totalInvoiced, defaultCurrency)}</span>
              <span className="text-[11px] text-muted block mt-0.5">{invoiceRows?.length || 0} invoices</span>
            </div>
            <div className="bg-background/40 border border-border/60 rounded-lg p-3">
              <span className="text-xs text-muted block mb-1">Total Collected</span>
              <span className="text-lg font-bold text-accent-green">{formatMoney(totalCollected, defaultCurrency)}</span>
              <span className="text-[11px] text-accent-green/80 block mt-0.5">{paymentRows?.length || 0} payments recorded</span>
            </div>
            <div className="bg-background/40 border border-border/60 rounded-lg p-3">
              <span className="text-xs text-muted block mb-1">Collection Efficiency</span>
              <span className="text-lg font-bold text-purple-400">{collectionRate}%</span>
              <span className="text-[11px] text-muted block mt-0.5">Paid vs. invoiced</span>
            </div>
          </div>

          {/* Progress bar of cash collected vs invoiced */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted mb-1.5">
              <span>Collection Progress</span>
              <span className="text-foreground font-medium">{formatMoney(totalCollected, defaultCurrency)} / {formatMoney(totalInvoiced, defaultCurrency)}</span>
            </div>
            <div className="w-full h-2.5 bg-border/60 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-accent-green rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, collectionRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily Email Cap Card */}
        <div className="bg-header/20 border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-accent-blue" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Email Dispatch</h2>
              </div>
              <span className="text-xs font-mono text-muted bg-background/50 px-2 py-0.5 rounded border border-border/40">
                {sentToday} / {dailyCap}
              </span>
            </div>
            <p className="text-xs text-muted mb-4">Brevo daily transactional & marketing quota usage.</p>

            <div className="w-full h-3 bg-border/60 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  sentToday / dailyCap > 0.85 ? "bg-red-400" : "bg-accent-blue"
                }`}
                style={{ width: `${Math.min(100, (sentToday / dailyCap) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted">
              <span>{Math.round((sentToday / dailyCap) * 100)}% used</span>
              <span>{Math.max(0, dailyCap - sentToday)} sends remaining</span>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 mt-3 flex items-center justify-between text-xs">
            <span className="text-muted">Total Campaigns</span>
            <Link href="/crm/campaigns" className="text-accent-blue hover:underline font-medium">
              {totalCampaigns || 0} campaigns
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Visual Analytics Charts & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Journey Funnel */}
        <div className="bg-header/20 border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Pipeline Funnel</h2>
            </div>
            <Link href="/crm/journeys" className="text-xs text-accent-blue hover:underline inline-flex items-center gap-1">
              Configure pipeline <ChevronRight size={12} />
            </Link>
          </div>
          <p className="text-xs text-muted mb-4">Distribution of {totalLeads || 0} leads across the stages of your customer journey.</p>

          <div className="flex flex-col gap-2.5 flex-1 justify-center">
            {stages.map((st) => {
              const count = stageCountMap[st.key] || 0;
              const barWidth = Math.max(8, Math.round((count / maxStageCount) * 100));
              const colorBg = st.is_won
                ? "bg-accent-green"
                : st.is_lost
                ? "bg-red-400/80"
                : "bg-accent-blue/80";

              return (
                <div key={st.key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{st.label}</span>
                    <span className="text-muted font-mono">{count} leads</span>
                  </div>
                  <div className="w-full h-3 bg-background/50 rounded-full overflow-hidden p-0.5 border border-border/30">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${colorBg}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7-Day Activity Trend Bar Chart */}
        <div className="bg-header/20 border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">7-Day Activity Velocity</h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-blue inline-block" /> Emails
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Leads
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mb-4">Volume comparison of new inquiries and campaign dispatches over the past 7 days.</p>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2 border-b border-border/60">
            {trendDays.map((d) => {
              const emailHeight = Math.max(6, Math.round((d.emails / maxDailyVolume) * 100));
              const leadHeight = Math.max(6, Math.round((d.leads / maxDailyVolume) * 100));

              return (
                <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* Email Bar */}
                    <div
                      className="w-2.5 sm:w-3.5 bg-accent-blue/80 hover:bg-accent-blue rounded-t transition-all group-hover:brightness-125"
                      style={{ height: `${d.emails === 0 ? 4 : emailHeight}%` }}
                      title={`${d.emails} emails sent`}
                    />
                    {/* Lead Bar */}
                    <div
                      className="w-2.5 sm:w-3.5 bg-emerald-400/80 hover:bg-emerald-400 rounded-t transition-all group-hover:brightness-125"
                      style={{ height: `${d.leads === 0 ? 4 : leadHeight}%` }}
                      title={`${d.leads} leads created`}
                    />
                  </div>
                  <span className="text-[11px] text-muted font-medium mt-1">{d.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-xs text-muted pt-3">
            <span>WhatsApp Communications logged:</span>
            <Link href="/crm/whatsapp" className="text-foreground hover:text-accent-blue font-medium inline-flex items-center gap-1">
              <MessageCircle size={13} className="text-accent-green" /> {waEventsCount || 0} messages
            </Link>
          </div>
        </div>
      </div>

      {/* Row 4: Email Analytics Rates & Lead Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Email Engagement Rates */}
        <div className="lg:col-span-2 bg-header/20 border border-border/80 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-accent-blue" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Campaign Engagement Health</h2>
            </div>
            <Link href="/crm/monitoring" className="text-xs text-accent-blue hover:underline inline-flex items-center gap-1">
              Live Monitoring <ChevronRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background/40 border border-border/50 rounded-lg p-3 text-center">
              <span className="text-xs text-muted block mb-1">Delivered</span>
              <span className="text-xl font-bold text-accent-green">{deliveryPct}%</span>
              <span className="text-[11px] text-muted block mt-0.5">{emailCounts.delivered} confirmed</span>
            </div>
            <div className="bg-background/40 border border-border/50 rounded-lg p-3 text-center">
              <span className="text-xs text-muted block mb-1">Open Rate</span>
              <span className="text-xl font-bold text-accent-blue">{openPct}%</span>
              <span className="text-[11px] text-muted block mt-0.5">{emailCounts.opened} opens</span>
            </div>
            <div className="bg-background/40 border border-border/50 rounded-lg p-3 text-center">
              <span className="text-xs text-muted block mb-1">Click Rate</span>
              <span className="text-xl font-bold text-purple-400">{clickPct}%</span>
              <span className="text-[11px] text-muted block mt-0.5">{emailCounts.clicked} clicks</span>
            </div>
            <div className="bg-background/40 border border-border/50 rounded-lg p-3 text-center">
              <span className="text-xs text-muted block mb-1">Bounces</span>
              <span className={`text-xl font-bold ${emailCounts.bounce > 0 ? "text-red-400" : "text-muted"}`}>
                {emailCounts.bounce}
              </span>
              <span className="text-[11px] text-muted block mt-0.5">soft & hard bounces</span>
            </div>
          </div>
        </div>

        {/* Lead Inflow Sources */}
        <div className="bg-header/20 border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Top Lead Sources</h2>
              <Link href="/crm/leads" className="text-xs text-accent-blue hover:underline">
                All ({totalLeads})
              </Link>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {leadSourceList.length === 0 ? (
                <p className="text-xs text-muted">No leads recorded yet.</p>
              ) : (
                leadSourceList.map(([source, count]) => {
                  const pct = Math.round((count / (totalLeads || 1)) * 100);
                  return (
                    <div key={source} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground">{source}</span>
                        <span className="text-muted font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-background/50 rounded-full overflow-hidden">
                        <div className="h-full bg-accent-blue/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-border/40 mt-3">
            <Link href="/crm/import" className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1">
              Import more contacts via CSV <ChevronRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 5: Quick Shortcuts & Recent Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Inquiries List */}
        <div className="lg:col-span-2 bg-header/20 border border-border/80 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Recent Inquiries / Leads</h2>
            <Link href="/crm/leads" className="text-xs text-accent-blue hover:underline inline-flex items-center gap-1">
              View all leads <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-border/40">
            {(recentActivity || []).length === 0 ? (
              <p className="text-xs text-muted py-3">No inquiries received yet.</p>
            ) : (
              (recentActivity || []).map((lead) => (
                <Link
                  key={lead.id}
                  href={`/crm/leads/${lead.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-header/40 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground group-hover:text-accent-blue transition-colors">
                      {lead.name}
                    </span>
                    <span className="text-xs text-muted">{lead.company || "Independent"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-border/40 text-muted capitalize">
                      {lead.current_stage_key || "lead"}
                    </span>
                    <span className="text-xs text-muted hidden sm:inline">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Shortcuts / Navigation Launchpad */}
        <div className="bg-header/20 border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <Link
                href="/crm/campaigns/new"
                className="p-2.5 rounded-lg border border-border/60 bg-background/30 hover:border-accent-blue/50 transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground block">Email Broadcast</span>
                  <span className="text-muted text-[11px]">Send announcements or newsletters</span>
                </div>
                <Send size={14} className="text-muted" />
              </Link>
              <Link
                href="/crm/whatsapp"
                className="p-2.5 rounded-lg border border-border/60 bg-background/30 hover:border-accent-green/50 transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground block">WhatsApp Direct</span>
                  <span className="text-muted text-[11px]">Personalized client messaging</span>
                </div>
                <MessageCircle size={14} className="text-muted" />
              </Link>
              <Link
                href="/crm/import"
                className="p-2.5 rounded-lg border border-border/60 bg-background/30 hover:border-accent-blue/50 transition-colors flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground block">Spreadsheet Import</span>
                  <span className="text-muted text-[11px]">Upload CSV/XLSX client lists</span>
                </div>
                <Users size={14} className="text-muted" />
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted">
            <span>CRM Database Status</span>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={12} /> Healthy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
