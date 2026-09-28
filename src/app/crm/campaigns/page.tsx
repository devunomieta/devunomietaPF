import { createClient } from "@/utils/supabase/server";
import { CampaignsListClient, type CampaignWithMetrics } from "./CampaignsListClient";

export const metadata = { title: "Campaigns · CRM" };
export const dynamic = "force-dynamic";

export default async function CrmCampaignsPage() {
  const supabase = await createClient();

  // Fetch campaigns and all email events to aggregate stats
  const [{ data: campaigns }, { data: events }] = await Promise.all([
    supabase
      .from("crm_email_campaigns")
      .select("id, subject, kind, status, sent_count, total_recipients, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("crm_email_events")
      .select("campaign_id, type"),
  ]);

  // Aggregate event counts per campaign_id
  const eventStatsByCampaign = new Map<string, { delivered: number; opened: number; clicked: number; bounce: number }>();

  for (const e of events || []) {
    if (!e.campaign_id) continue;
    if (!eventStatsByCampaign.has(e.campaign_id)) {
      eventStatsByCampaign.set(e.campaign_id, { delivered: 0, opened: 0, clicked: 0, bounce: 0 });
    }
    const current = eventStatsByCampaign.get(e.campaign_id)!;
    if (e.type === "delivered") current.delivered++;
    else if (e.type === "opened") current.opened++;
    else if (e.type === "clicked") current.clicked++;
    else if (e.type === "soft_bounce" || e.type === "hard_bounce") current.bounce++;
  }

  const campaignsWithMetrics: CampaignWithMetrics[] = (campaigns || []).map((c) => {
    const stats = eventStatsByCampaign.get(c.id) || { delivered: 0, opened: 0, clicked: 0, bounce: 0 };
    return {
      id: c.id,
      subject: c.subject,
      kind: c.kind,
      status: c.status,
      sent_count: c.sent_count,
      total_recipients: c.total_recipients,
      created_at: c.created_at,
      delivered_count: stats.delivered,
      opened_count: stats.opened,
      clicked_count: stats.clicked,
      bounce_count: stats.bounce,
    };
  });

  return <CampaignsListClient campaigns={campaignsWithMetrics} />;
}
