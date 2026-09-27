import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";

export const metadata = { title: "Campaign · CRM" };

type EventRow = { id: string; recipient_email: string; type: string; occurred_at: string };

const TYPE_STYLES: Record<string, string> = {
  sent: "bg-accent-blue/15 text-accent-blue",
  delivered: "bg-accent-blue/15 text-accent-blue",
  opened: "bg-accent-green/15 text-accent-green",
  clicked: "bg-accent-green/15 text-accent-green",
  soft_bounce: "bg-yellow-400/15 text-yellow-400",
  hard_bounce: "bg-red-400/15 text-red-400",
  complaint: "bg-red-400/15 text-red-400",
  unsubscribed: "bg-muted/20 text-muted",
  error: "bg-red-400/15 text-red-400",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: campaign }, { data: events }] = await Promise.all([
    supabase.from("crm_email_campaigns").select("*").eq("id", id).maybeSingle(),
    supabase.from("crm_email_events").select("id, recipient_email, type, occurred_at").eq("campaign_id", id).order("occurred_at", { ascending: false }),
  ]);

  if (!campaign) notFound();

  const rows = (events as EventRow[]) || [];
  const counts: Record<string, number> = {};
  for (const e of rows) counts[e.type] = (counts[e.type] || 0) + 1;

  const columns: CrmColumn<EventRow>[] = [
    { header: "Recipient", cell: (e) => e.recipient_email },
    { header: "Event", cell: (e) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[e.type] || ""}`}>{e.type.replace("_", " ")}</span> },
    { header: "When", cell: (e) => new Date(e.occurred_at).toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/crm/campaigns" className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} /> Campaigns
      </Link>

      <div>
        <h1 className="text-xl font-bold text-foreground">{campaign.subject}</h1>
        <p className="text-sm text-muted">{campaign.kind} · {campaign.status} · {campaign.sent_count}/{campaign.total_recipients} sent</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(counts).map(([type, count]) => (
          <div key={type} className="bg-header/20 border border-border rounded-lg px-4 py-2 text-center min-w-[90px]">
            <p className="text-lg font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted capitalize">{type.replace("_", " ")}</p>
          </div>
        ))}
      </div>

      <div className="bg-header/20 border border-border rounded-xl p-2 sm:p-4">
        <ResponsiveTable columns={columns} rows={rows} emptyLabel="No events recorded yet." />
      </div>
    </div>
  );
}
