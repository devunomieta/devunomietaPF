import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CampaignDetailClient, type CampaignRecord, type EventRecord } from "./CampaignDetailClient";

export const metadata = { title: "Campaign Analytics · CRM" };
export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: campaign }, { data: events }] = await Promise.all([
    supabase
      .from("crm_email_campaigns")
      .select("id, subject, kind, status, html, sent_count, total_recipients, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("crm_email_events")
      .select("id, recipient_email, type, occurred_at, link_url")
      .eq("campaign_id", id)
      .order("occurred_at", { ascending: false }),
  ]);

  if (!campaign) notFound();

  return (
    <CampaignDetailClient
      campaign={campaign as CampaignRecord}
      events={(events as EventRecord[]) || []}
    />
  );
}

