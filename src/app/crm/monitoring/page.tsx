import { createClient } from "@/utils/supabase/server";
import { AlertTriangle } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { MonitoringActions } from "./MonitoringActions";

export const metadata = { title: "Monitoring · CRM" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JobRow = { id: string; type: string; status: string; progress: number; total: number; error: string | null; created_at: string };

function pct(n: number, total: number) {
  if (total === 0) return 0;
  return Math.round((n / total) * 1000) / 10;
}

export default async function CrmMonitoringPage() {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [{ data: events }, { data: jobs }, { data: settings }] = await Promise.all([
    supabase.from("crm_email_events").select("type").gte("occurred_at", since.toISOString()),
    supabase.from("crm_jobs").select("id, type, status, progress, total, error, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle(),
  ]);

  const counts: Record<string, number> = {};
  for (const e of events || []) counts[e.type] = (counts[e.type] || 0) + 1;

  const sent = counts.sent || 0;
  const delivered = counts.delivered || 0;
  const bounced = (counts.hard_bounce || 0) + (counts.soft_bounce || 0);
  const complaints = counts.complaint || 0;
  const opened = counts.opened || 0;
  const clicked = counts.clicked || 0;

  const bounceRate = pct(bounced, sent || delivered);
  const complaintRate = pct(complaints, sent || delivered);
  const deliveryRate = pct(delivered, sent);
  const openRate = pct(opened, delivered || sent);
  const clickRate = pct(clicked, delivered || sent);

  const bounceThreshold = settings?.bounce_alert_threshold ?? 5;
  const complaintThreshold = settings?.complaint_alert_threshold ?? 0.1;
  const alerting = bounceRate > bounceThreshold || complaintRate > complaintThreshold;

  const jobRows = (jobs as JobRow[]) || [];
  const pendingJobs = jobRows.filter((j) => j.status === "queued" || j.status === "processing").length;
  const failedJobs = jobRows.filter((j) => j.status === "failed").length;

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
          <p className="text-lg font-bold text-foreground">{sent}</p>
          <p className="text-xs text-muted">emails sent (30d)</p>
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

      <div className="bg-header/20 border border-border rounded-xl p-2 sm:p-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider px-2 pt-2 mb-2">Recent jobs</h2>
        <ResponsiveTable columns={jobColumns} rows={jobRows} emptyLabel="No background jobs yet." />
      </div>
    </div>
  );
}
