"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import { sendEmail } from "@/lib/brevo";
import { processBulkSendJobBatch, getTodaysSentEmailCount } from "@/lib/crm/jobs";
import type { ActionResult } from "@/lib/crm/types";

type SendResult = { success: true; warning?: string } | { error: string };

export async function sendSingleEmail(formData: FormData): Promise<SendResult> {
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

  const { personalizeText } = await import("@/lib/crm/personalization");
  const { renderBulletproofEmail } = await import("@/lib/crm/emailTemplate");
  const personalizedSubject = personalizeText(subject, { name, email });
  const personalizedBody = personalizeText(html, { name, email });
  const fullHtml = renderBulletproofEmail({
    subject: personalizedSubject,
    contentHtml: personalizedBody,
    brandName: "Joseph Unomieta",
    senderAddress: "Joseph Unomieta",
  });

  const result = await sendEmail({ to: [{ email, name }], subject: personalizedSubject, htmlContent: fullHtml });

  const { error: logError } = await supabase.from("crm_email_events").insert([
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
  if (logError) console.error(`crm_email_events insert failed for ${email}:`, logError.message);

  await supabase
    .from("crm_email_campaigns")
    .update({ status: "error" in result ? "failed" : "sent", sent_count: "error" in result ? 0 : 1 })
    .eq("id", campaign.id);

  if ("error" in result) return { error: result.error };

  revalidatePath("/crm/campaigns");
  if (clientId) revalidatePath(`/crm/clients/${clientId}`);
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);

  if (logError) {
    return { success: true, warning: `Sent, but couldn't save it to the activity log: ${logError.message}` };
  }
  return { success: true };
}

type Audience = { segment: "clients" | "leads" | "all"; tags: string[]; stageKey: string };

async function resolveAudience(supabase: Awaited<ReturnType<typeof requireAdmin>>, audience: Audience) {
  const rows: Array<{
    id: string;
    name: string;
    email: string | null;
    company?: string | null;
    phone?: string | null;
    isClient?: boolean;
    isLead?: boolean;
  }> = [];

  if (audience.segment === "all" || audience.segment === "clients") {
    let clientsQuery = supabase.from("crm_clients").select("id, name, email, company, phone, tags").not("email", "is", null);
    if (audience.tags.length > 0) clientsQuery = clientsQuery.overlaps("tags", audience.tags);
    const { data: clientsData } = await clientsQuery;
    (clientsData || []).forEach((c) => rows.push({ ...c, isClient: true }));
  }

  if (audience.segment === "all" || audience.segment === "leads") {
    let leadsQuery = supabase.from("crm_leads").select("id, name, email, company, phone, tags, current_stage_key").not("email", "is", null);
    if (audience.tags.length > 0) leadsQuery = leadsQuery.overlaps("tags", audience.tags);
    if (audience.stageKey && audience.segment === "leads") leadsQuery = leadsQuery.eq("current_stage_key", audience.stageKey);
    const { data: leadsData } = await leadsQuery;
    (leadsData || []).forEach((l) => rows.push({ ...l, isLead: true }));
  }

  // De-duplicate if someone is both in clients & leads when 'all' is selected
  const seenEmails = new Set<string>();
  const uniqueRows: typeof rows = [];
  for (const r of rows) {
    if (!r.email) continue;
    const cleanEmail = r.email.trim().toLowerCase();
    if (!cleanEmail || seenEmails.has(cleanEmail)) continue;
    seenEmails.add(cleanEmail);
    uniqueRows.push(r);
  }

  const emails = uniqueRows.map((r) => r.email!.toLowerCase());
  const { data: suppressed } = emails.length > 0 ? await supabase.from("crm_suppressions").select("email").in("email", emails) : { data: [] };
  const suppressedSet = new Set((suppressed || []).map((s) => String(s.email).toLowerCase()));

  return uniqueRows
    .filter((r) => r.email && !suppressedSet.has(r.email.toLowerCase()))
    .map((r) => ({
      email: r.email as string,
      name: r.name as string,
      company: r.company || null,
      phone: r.phone || null,
      clientId: r.isClient ? r.id : undefined,
      leadId: r.isLead ? r.id : undefined,
    }));
}

export async function previewAudienceCount(audience: Audience): Promise<{ count: number }> {
  const supabase = await requireAdmin();
  const recipients = await resolveAudience(supabase, audience);
  return { count: recipients.length };
}

export async function uploadCampaignImage(formData: FormData): Promise<{ success: true; url: string } | { error: string }> {
  await requireAdmin();
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const adminDb = createAdminClient();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { error: "No image file provided." };

  if (!file.type.startsWith("image/")) {
    return { error: "File must be an image (JPEG, PNG, WebP, GIF, SVG)." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "Image size must be less than 5MB." };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `campaigns/img-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await adminDb.storage
    .from("assets")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = adminDb.storage.from("assets").getPublicUrl(path);
  return { success: true, url: publicUrl };
}

export async function sendTestCampaignEmail({
  emails,
  subject,
  html,
}: {
  emails: string[];
  subject: string;
  html: string;
}): Promise<{ success: true } | { error: string }> {
  await requireAdmin();

  if (!emails || emails.length === 0) return { error: "No recipient emails provided." };
  if (!subject || !html) return { error: "Subject and content are required for test email." };

  const { renderBulletproofEmail } = await import("@/lib/crm/emailTemplate");
  const { personalizeText } = await import("@/lib/crm/personalization");

  // Sample recipient for token preview
  const sampleRecipient = {
    name: "Dr. Sarah Johnson",
    first_name: "Sarah",
    last_name: "Johnson",
    company: "Apex Diagnostic Laboratories",
    phone: "+1 (555) 234-8890",
  };

  const personalizedSubject = personalizeText(`[TEST] ${subject}`, sampleRecipient);
  const personalizedHtml = personalizeText(html, sampleRecipient);

  const fullEmailHtml = renderBulletproofEmail({
    subject: personalizedSubject,
    contentHtml: personalizedHtml,
    brandName: "Joseph Unomieta",
    senderAddress: "Joseph Unomieta · Full-Stack Healthcare & Software Consultant",
  });

  const sendResults = await Promise.all(
    emails.map((email) =>
      sendEmail({
        to: [{ email, name: "Test Recipient" }],
        subject: personalizedSubject,
        htmlContent: fullEmailHtml,
      })
    )
  );

  const firstError = sendResults.find((r) => "error" in r);
  if (firstError && "error" in firstError) {
    return { error: firstError.error };
  }

  return { success: true };
}

export async function saveCampaignDraft(formData: FormData): Promise<{ success: true; draftId: string } | { error: string }> {
  const supabase = await requireAdmin();

  const draftId = (formData.get("draftId") as string) || null;
  const subject = (formData.get("subject") as string)?.trim() || "(Untitled Draft)";
  const html = (formData.get("html") as string) || "";
  const segment = (formData.get("segment") as "clients" | "leads" | "all") || "leads";
  const stageKey = (formData.get("stageKey") as string) || "";
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];

  const audience: Audience = { segment, tags, stageKey };

  if (draftId) {
    const { error } = await supabase
      .from("crm_email_campaigns")
      .update({
        subject,
        html,
        audience,
        status: "draft",
      })
      .eq("id", draftId);

    if (error) return { error: error.message };
    revalidatePath("/crm/campaigns");
    return { success: true, draftId };
  }

  const { data, error } = await supabase
    .from("crm_email_campaigns")
    .insert([
      {
        subject,
        html,
        audience,
        kind: "bulk",
        status: "draft",
        total_recipients: 0,
      },
    ])
    .select("id")
    .single();

  if (error || !data) return { error: error?.message || "Failed to save draft." };

  revalidatePath("/crm/campaigns");
  return { success: true, draftId: data.id };
}

export async function createBulkCampaign(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const draftId = (formData.get("draftId") as string) || null;
  const subject = (formData.get("subject") as string)?.trim();
  const html = formData.get("html") as string;
  const segment = (formData.get("segment") as "clients" | "leads" | "all") || "leads";
  const stageKey = (formData.get("stageKey") as string) || "";
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];
  const scheduledAt = (formData.get("scheduledAt") as string)?.trim() || null;

  if (!subject || !html) return { error: "Subject and message are required." };

  const audience: Audience = { segment, tags, stageKey };
  const recipients = await resolveAudience(supabase, audience);
  if (recipients.length === 0) return { error: "No recipients match that audience." };

  const { renderBulletproofEmail } = await import("@/lib/crm/emailTemplate");
  const wrappedHtml = renderBulletproofEmail({
    subject,
    contentHtml: html,
    brandName: "Joseph Unomieta",
    senderAddress: "Joseph Unomieta · Full-Stack Healthcare & Software Consultant",
  });

  const isScheduled = !!scheduledAt && new Date(scheduledAt).getTime() > Date.now();
  const initialStatus = isScheduled ? "queued" : "queued";

  let campaignId = draftId;

  if (draftId) {
    const { error: updateErr } = await supabase
      .from("crm_email_campaigns")
      .update({
        subject,
        html: wrappedHtml,
        kind: "bulk",
        status: initialStatus,
        scheduled_at: isScheduled ? new Date(scheduledAt).toISOString() : null,
        audience,
        total_recipients: recipients.length,
      })
      .eq("id", draftId);

    if (updateErr) return { error: updateErr.message };
  } else {
    const { data: campaign, error: campaignError } = await supabase
      .from("crm_email_campaigns")
      .insert([
        {
          subject,
          html: wrappedHtml,
          kind: "bulk",
          status: initialStatus,
          scheduled_at: isScheduled ? new Date(scheduledAt).toISOString() : null,
          audience,
          total_recipients: recipients.length,
        },
      ])
      .select("id")
      .single();

    if (campaignError || !campaign) return { error: campaignError?.message || "Failed to create campaign." };
    campaignId = campaign.id;
  }

  // If scheduled for later, do not dispatch immediately
  if (isScheduled) {
    revalidatePath("/crm/campaigns");
    return { success: true };
  }

  const { data: job, error: jobError } = await supabase
    .from("crm_jobs")
    .insert([
      {
        type: "bulk_send",
        status: "processing",
        payload: { campaignId, recipients, subject, html: wrappedHtml },
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
