import { createClient } from "@/utils/supabase/server";
import { AlertTriangle } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { CrmUrlPagination } from "@/components/crm/CrmUrlPagination";
import { MonitoringActions } from "./MonitoringActions";

import { ReportsSection } from "@/components/crm/ReportsSection";

export const metadata = { title: "Monitoring · CRM" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JobRow = { id: string; type: string; status: string; progress: number; total: number; error: string | null; created_at: string };

function pct(n: number, total: number) {
  if (total === 0) return 0;
  return Math.round((n / total) * 1000) / 10;
}

export default async function CrmMonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 20;

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [{ data: events }, { data: jobs }, { data: settings }] = await Promise.all([
    supabase.from("crm_email_events").select("id, type, message_id, recipient_email, occurred_at, meta").gte("occurred_at", since.toISOString()),
    supabase.from("crm_jobs").select("id, type, status, progress, total, error, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle(),
  ]);

  // Aggregate events per unique email / message instance
  const sentMessageIds = new Set<string>();
  const deliveredMessageIds = new Set<string>();
  const openedMessageIds = new Set<string>();
  const clickedMessageIds = new Set<string>();
  const bouncedEvents: Array<{ id: string; email: string; type: string; date: string; reason?: string }> = [];
  let complaints = 0;

  for (const e of events || []) {
    const msgKey = e.message_id || e.recipient_email || e.id;
    if (e.type === "sent") {
      sentMessageIds.add(msgKey);
    } else if (e.type === "delivered") {
      deliveredMessageIds.add(msgKey);
    } else if (e.type === "opened") {
      openedMessageIds.add(msgKey);
    } else if (e.type === "clicked") {
      clickedMessageIds.add(msgKey);
    } else if (e.type === "hard_bounce" || e.type === "soft_bounce") {
      bouncedEvents.push({
        id: e.id,
        email: e.recipient_email || "Unknown",
        type: e.type === "hard_bounce" ? "Hard Bounce" : "Soft Bounce",
        date: new Date(e.occurred_at).toLocaleString(),
        reason: (e.meta as Record<string, unknown>)?.reason as string || (e.meta as Record<string, unknown>)?.raw_event as string || "Mailbox temporarily unavailable / full",
      });
    } else if (e.type === "complaint") {
      complaints++;
    }
  }

  // If external transactional sends or test emails were delivered directly without an explicit 'sent' event,
  // ensure the effective total attempts reflect all known delivered/bounced/sent messages.
  const totalAttempted = Math.max(sentMessageIds.size, deliveredMessageIds.size + bouncedEvents.length);
  const delivered = deliveredMessageIds.size;
  const bounced = bouncedEvents.length;
  const opened = openedMessageIds.size;
  const clicked = clickedMessageIds.size;

  const deliveryRate = totalAttempted > 0 ? Math.min(100, pct(delivered, totalAttempted)) : 0;
  const bounceRate = totalAttempted > 0 ? pct(bounced, totalAttempted) : 0;
  const complaintRate = totalAttempted > 0 ? pct(complaints, totalAttempted) : 0;
  const openRate = delivered > 0 ? pct(opened, delivered) : 0;
  const clickRate = delivered > 0 ? pct(clicked, delivered) : 0;

  const bounceThreshold = settings?.bounce_alert_threshold ?? 5;
  const complaintThreshold = settings?.complaint_alert_threshold ?? 0.1;
  const alerting = bounceRate > bounceThreshold || complaintRate > complaintThreshold;

  const jobRows = (jobs as JobRow[]) || [];
  const pendingJobs = jobRows.filter((j) => j.status === "queued" || j.status === "processing").length;
  const failedJobs = jobRows.filter((j) => j.status === "failed").length;

  const start = (currentPage - 1) * pageSize;
  const pagedJobs = jobRows.slice(start, start + pageSize);

  const jobColumns: CrmColumn<JobRow>[] = [
    { header: "Type", cell: (j) => <span className="capitalize">{j.type.replace("_", " ")}</span> },
    {
      header: "Status",
      cell: (j) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            j.status === "done" ? "bg-accent-green/15 text-accent-green" : j.status === "failed" ? "bg-red-400/15 text-red-400" : "bg-accent-blue/15 text-accent-blue"
          }`}
        >
          {j.status}
        </span>
      ),
    },
    { header: "Progress", cell: (j) => `${j.progress} / ${j.total}` },
    { header: "Created", cell: (j) => new Date(j.created_at).toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sender health & monitoring</h1>
          <p className="text-sm text-muted">Last 30 days of mail events, plus the background job queue.</p>
        </div>
        <MonitoringActions />
      </div>

      <ReportsSection configuredEmails={settings?.report_notification_emails || []} />

      {alerting && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            Bounce rate ({bounceRate}%) or complaint rate ({complaintRate}%) is above threshold
            (bounce &gt; {bounceThreshold}%, complaint &gt; {complaintThreshold}%). Consider pausing bulk sends until this recovers.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Delivery rate", value: `${deliveryRate}%` },
          { label: "Bounce rate", value: `${bounceRate}%`, warn: bounceRate > bounceThreshold },
          { label: "Complaint rate", value: `${complaintRate}%`, warn: complaintRate > complaintThreshold },
          { label: "Open rate", value: `${openRate}%` },
          { label: "Click rate", value: `${clickRate}%` },
        ].map((m) => (
          <div key={m.label} className="bg-header/20 border border-border rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${m.warn ? "text-red-400" : "text-foreground"}`}>{m.value}</p>
            <p className="text-xs text-muted">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-header/20 border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalAttempted}</p>
          <p className="text-xs text-muted">emails dispatched (30d)</p>
        </div>
        <div className="bg-header/20 border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-accent-blue">{pendingJobs}</p>
          <p className="text-xs text-muted">jobs pending</p>
        </div>
        <div className="bg-header/20 border border-border rounded-xl p-3 text-center">
          <p className={`text-lg font-bold ${failedJobs > 0 ? "text-red-400" : "text-foreground"}`}>{failedJobs}</p>
          <p className="text-xs text-muted">jobs failed</p>
        </div>
      </div>

      {bouncedEvents.length > 0 && (
        <div className="bg-header/20 border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Bounced Emails & Delivery Failures ({bouncedEvents.length})
            </h2>
            <span className="text-xs text-muted">Tracked via Brevo delivery webhooks</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/80 text-muted">
                  <th className="py-2 px-3">Recipient Email</th>
                  <th className="py-2 px-3">Bounce Type</th>
                  <th className="py-2 px-3">Diagnostic Reason</th>
                  <th className="py-2 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {bouncedEvents.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground font-mono">{b.email}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-400/15 text-red-400 border border-red-400/25">
                        {b.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted">{b.reason}</td>
                    <td className="py-2.5 px-3 text-right text-muted">{b.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-header/20 border border-border rounded-xl p-2 sm:p-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider px-2 pt-2 mb-2">Recent jobs</h2>
        <ResponsiveTable columns={jobColumns} rows={pagedJobs} emptyLabel="No background jobs yet." />
        <CrmUrlPagination totalItems={jobRows.length} pageSize={pageSize} />
      </div>
    </div>
  );
}
