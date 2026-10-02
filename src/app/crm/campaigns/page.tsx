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
      .limit(500),
    supabase
      .from("crm_email_events")
      .select("id, campaign_id, type, message_id, recipient_email"),
  ]);

  // Aggregate event counts per campaign_id with deduplication
  const campaignDelivered = new Map<string, Set<string>>();
  const campaignOpens = new Map<string, Set<string>>();
  const campaignClicks = new Map<string, Set<string>>();
  const campaignBounces = new Map<string, number>();

  for (const e of events || []) {
    if (!e.campaign_id) continue;
    const cid = e.campaign_id;
    const msgKey = e.message_id || e.recipient_email || e.id;

    if (!campaignDelivered.has(cid)) campaignDelivered.set(cid, new Set());
    if (!campaignOpens.has(cid)) campaignOpens.set(cid, new Set());
    if (!campaignClicks.has(cid)) campaignClicks.set(cid, new Set());
    if (!campaignBounces.has(cid)) campaignBounces.set(cid, 0);

    if (e.type === "delivered") {
      campaignDelivered.get(cid)!.add(msgKey);
    } else if (e.type === "opened") {
      campaignOpens.get(cid)!.add(msgKey);
    } else if (e.type === "clicked") {
      campaignClicks.get(cid)!.add(msgKey);
    } else if (e.type === "soft_bounce" || e.type === "hard_bounce") {
      campaignBounces.set(cid, (campaignBounces.get(cid) || 0) + 1);
    }
  }

  const campaignsWithMetrics: CampaignWithMetrics[] = (campaigns || []).map((c) => {
    const deliveredCount = campaignDelivered.get(c.id)?.size || 0;
    const openedCount = campaignOpens.get(c.id)?.size || 0;
    const clickedCount = campaignClicks.get(c.id)?.size || 0;
    const bounceCount = campaignBounces.get(c.id) || 0;
    return {
      id: c.id,
      subject: c.subject,
      kind: c.kind,
      status: c.status,
      sent_count: c.sent_count,
      total_recipients: c.total_recipients,
      created_at: c.created_at,
      delivered_count: deliveredCount,
      opened_count: openedCount,
      clicked_count: clickedCount,
      bounce_count: bounceCount,
    };
  });

  return <CampaignsListClient campaigns={campaignsWithMetrics} />;
}
