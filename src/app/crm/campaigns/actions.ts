"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import { sendEmail } from "@/lib/brevo";
import { processBulkSendJobBatch, getTodaysSentEmailCount } from "@/lib/crm/jobs";
import type { ActionResult } from "@/lib/crm/types";

export async function sendSingleEmail(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const email = (formData.get("email") as string)?.trim();
  const name = (formData.get("recipientName") as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim();
  const html = formData.get("html") as string;
  const clientId = (formData.get("clientId") as string) || null;
  const leadId = (formData.get("leadId") as string) || null;

  if (!email || !subject || !html) return { error: "Recipient, subject, and message are required." };

  const { data: suppressed } = await supabase.from("crm_suppressions").select("email").eq("email", email.toLowerCase()).maybeSingle();
  if (suppressed) return { error: `${email} is on the suppression list (bounced, complained, or unsubscribed) and can't be emailed.` };

  const { data: campaign, error: campaignError } = await supabase
    .from("crm_email_campaigns")
    .insert([{ subject, html, kind: "single", status: "sending", audience: {}, total_recipients: 1 }])
    .select("id")
    .single();
  if (campaignError) return { error: campaignError.message };

  const result = await sendEmail({ to: [{ email, name }], subject, htmlContent: html });

  await supabase.from("crm_email_events").insert([
    {
      campaign_id: campaign.id,
      client_id: clientId,
      lead_id: leadId,
      recipient_email: email,
      type: "error" in result ? "error" : "sent",
      message_id: "messageId" in result ? result.messageId : null,
      meta: "error" in result ? { error: result.error } : {},
    },
  ]);

  await supabase
    .from("crm_email_campaigns")
    .update({ status: "error" in result ? "failed" : "sent", sent_count: "error" in result ? 0 : 1 })
    .eq("id", campaign.id);

  if ("error" in result) return { error: result.error };

  revalidatePath("/crm/campaigns");
  if (clientId) revalidatePath(`/crm/clients/${clientId}`);
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);
  return { success: true };
}

type Audience = { segment: "clients" | "leads"; tags: string[]; stageKey: string };

async function resolveAudience(supabase: Awaited<ReturnType<typeof requireAdmin>>, audience: Audience) {
  const table = audience.segment === "clients" ? "crm_clients" : "crm_leads";
  let query = supabase.from(table).select("id, name, email").not("email", "is", null);
  if (audience.tags.length > 0) query = query.overlaps("tags", audience.tags);
  if (audience.segment === "leads" && audience.stageKey) query = query.eq("current_stage_key", audience.stageKey);

  const { data } = await query;
  const rows = data || [];

  const emails = rows.map((r) => r.email!.toLowerCase());
  const { data: suppressed } = emails.length > 0 ? await supabase.from("crm_suppressions").select("email").in("email", emails) : { data: [] };
  const suppressedSet = new Set((suppressed || []).map((s) => String(s.email).toLowerCase()));

  return rows
    .filter((r) => r.email && !suppressedSet.has(r.email.toLowerCase()))
    .map((r) => ({
      email: r.email as string,
      name: r.name as string,
      clientId: audience.segment === "clients" ? r.id : undefined,
      leadId: audience.segment === "leads" ? r.id : undefined,
    }));
}

export async function previewAudienceCount(audience: Audience): Promise<{ count: number }> {
  const supabase = await requireAdmin();
  const recipients = await resolveAudience(supabase, audience);
  return { count: recipients.length };
}

export async function createBulkCampaign(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const subject = (formData.get("subject") as string)?.trim();
  const html = formData.get("html") as string;
  const segment = (formData.get("segment") as "clients" | "leads") || "leads";
  const stageKey = (formData.get("stageKey") as string) || "";
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];

  if (!subject || !html) return { error: "Subject and message are required." };

  const audience: Audience = { segment, tags, stageKey };
  const recipients = await resolveAudience(supabase, audience);
  if (recipients.length === 0) return { error: "No recipients match that audience." };

  const { data: campaign, error: campaignError } = await supabase
    .from("crm_email_campaigns")
    .insert([{ subject, html, kind: "bulk", status: "queued", audience, total_recipients: recipients.length }])
    .select("id")
    .single();
  if (campaignError) return { error: campaignError.message };

  const { data: job, error: jobError } = await supabase
    .from("crm_jobs")
    .insert([
      {
        type: "bulk_send",
        status: "processing",
        payload: { campaignId: campaign.id, recipients, subject, html },
        total: recipients.length,
        progress: 0,
      },
    ])
    .select("*")
    .single();
  if (jobError || !job) return { error: jobError?.message || "Could not queue the send." };

  const { data: settings } = await supabase.from("crm_settings").select("brevo_daily_cap").eq("id", "default").maybeSingle();
  const dailyCap = settings?.brevo_daily_cap ?? 300;
  const sentToday = await getTodaysSentEmailCount(supabase);
  const remainingCap = Math.max(0, dailyCap - sentToday);

  await processBulkSendJobBatch(supabase, job as never, remainingCap);

  revalidatePath("/crm/campaigns");
  revalidatePath("/crm/monitoring");
  return { success: true };
}
