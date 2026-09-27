import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Plus } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { crmPrimaryBtnClass } from "@/components/crm/CrmModal";

export const metadata = { title: "Campaigns · CRM" };

type CampaignRow = {
  id: string;
  subject: string;
  kind: string;
  status: string;
  sent_count: number;
  total_recipients: number;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted/20 text-muted",
  queued: "bg-yellow-400/15 text-yellow-400",
  sending: "bg-accent-blue/15 text-accent-blue",
  sent: "bg-accent-green/15 text-accent-green",
  failed: "bg-red-400/15 text-red-400",
};

export default async function CrmCampaignsPage() {
  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("crm_email_campaigns")
    .select("id, subject, kind, status, sent_count, total_recipients, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (campaigns as CampaignRow[]) || [];

  const columns: CrmColumn<CampaignRow>[] = [
    {
      header: "Subject",
      cell: (c) => (
        <div className="flex items-center gap-2">
          <Link
            href={c.status === "draft" ? `/crm/campaigns/new?draftId=${c.id}` : `/crm/campaigns/${c.id}`}
            className="font-medium text-foreground hover:text-accent-blue"
          >
            {c.subject || "(Untitled Draft)"}
          </Link>
          {c.status === "draft" && (
            <Link
              href={`/crm/campaigns/new?draftId=${c.id}`}
              className="text-[11px] px-2 py-0.5 rounded bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 font-medium transition"
            >
              Resume
            </Link>
          )}
        </div>
      ),
    },
    { header: "Kind", cell: (c) => <span className="text-muted text-xs capitalize">{c.kind}</span> },
    {
      header: "Status",
      cell: (c) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status] || ""}`}>{c.status}</span>,
    },
    { header: "Sent / total", cell: (c) => `${c.sent_count} / ${c.total_recipients}` },
    { header: "Created", cell: (c) => new Date(c.created_at).toLocaleDateString() },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted">Single sends and bulk campaigns, in one trail.</p>
        </div>
        <Link href="/crm/campaigns/new" className={crmPrimaryBtnClass}>
          <Plus size={15} />
          New
        </Link>
      </div>

      <div className="bg-header/20 border border-border rounded-xl p-2 sm:p-4">
        <ResponsiveTable columns={columns} rows={rows} emptyLabel="No campaigns sent yet." />
      </div>
    </div>
  );
}
