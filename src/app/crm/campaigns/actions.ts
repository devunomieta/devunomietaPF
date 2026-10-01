"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireCrmUser } from "@/lib/crm/auth";
import { sendEmail } from "@/lib/brevo";
import { processBulkSendJobBatch, getTodaysSentEmailCount } from "@/lib/crm/jobs";
import { parseRawEmailsList } from "@/lib/crm/emailParser";
import type { ActionResult } from "@/lib/crm/types";

type SendResult = { success: true; warning?: string } | { error: string };

export async function sendSingleEmail(formData: FormData): Promise<SendResult> {
  await requireCrmUser({ page: "campaigns", action: "campaigns_send" });
  const supabase = createAdminClient();

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

  const { resolveEntityFromEmail, recordCampaignEmailInEntityFeed } = await import("@/lib/crm/communicationResolver");
  let resolvedClientId = clientId;
  let resolvedLeadId = leadId;
  let resolvedContactId: string | null = null;
  let resolvedName = name;

  if (!resolvedClientId && !resolvedLeadId) {
    const resolved = await resolveEntityFromEmail(email);
    if (resolved.clientId) resolvedClientId = resolved.clientId;
    if (resolved.leadId) resolvedLeadId = resolved.leadId;
    if (resolved.contactId) resolvedContactId = resolved.contactId;
    if (!resolvedName && (resolved.contactName || resolved.entityName)) {
      resolvedName = resolved.contactName || resolved.entityName || "";
    }
  }

  const { personalizeText } = await import("@/lib/crm/personalization");
  const { renderBulletproofEmail } = await import("@/lib/crm/emailTemplate");
  const personalizedSubject = personalizeText(subject, { name: resolvedName, email });
  const personalizedBody = personalizeText(html, { name: resolvedName, email });
  const fullHtml = renderBulletproofEmail({
    subject: personalizedSubject,
    contentHtml: personalizedBody,
    brandName: "Joseph Unomieta",
    senderAddress: "Joseph Unomieta",
  });

  const result = await sendEmail({ to: [{ email, name: resolvedName }], subject: personalizedSubject, htmlContent: fullHtml });

  const messageId = "messageId" in result ? result.messageId : null;

  const { error: logError } = await supabase.from("crm_email_events").insert([
    {
      campaign_id: campaign.id,
      client_id: resolvedClientId,
      lead_id: resolvedLeadId,
      recipient_email: email,
      type: "error" in result ? "error" : "sent",
      message_id: messageId,
      meta: "error" in result ? { error: result.error } : {},
    },
  ]);
  if (logError) console.error(`crm_email_events insert failed for ${email}:`, logError.message);

  await supabase
    .from("crm_email_campaigns")
    .update({ status: "error" in result ? "failed" : "sent", sent_count: "error" in result ? 0 : 1 })
    .eq("id", campaign.id);

  if ("error" in result) return { error: result.error };

  // If this email is associated with a client or lead in the CRM, record in communications timeline
  if (resolvedClientId || resolvedLeadId) {
    try {
      await recordCampaignEmailInEntityFeed({
        recipientEmail: email,
        recipientName: resolvedName,
        subject: personalizedSubject,
        htmlContent: fullHtml,
        messageId,
        clientId: resolvedClientId,
        leadId: resolvedLeadId,
        contactId: resolvedContactId,
      });
    } catch (feedErr) {
      console.error(`Failed to record single campaign email in feed for ${email}:`, feedErr);
    }
  }

  revalidatePath("/crm/campaigns");
  if (resolvedClientId) revalidatePath(`/crm/clients/${resolvedClientId}`);
  if (resolvedLeadId) {
    revalidatePath("/crm/leads");
    revalidatePath(`/crm/leads/${resolvedLeadId}`);
  }

  if (logError) {
    return { success: true, warning: `Sent, but couldn't save it to the activity log: ${logError.message}` };
  }
  return { success: true };
}

type Audience = {
  segment?: "clients" | "leads" | "all";
  tags?: string[];
  stageKey?: string;
  customEmails?: string[];
};

export async function resolveCustomAudience(
  supabase: ReturnType<typeof createAdminClient>,
  rawEmails: string[] | string
) {
  const emailList = Array.isArray(rawEmails) ? rawEmails : parseRawEmailsList(rawEmails);
  if (emailList.length === 0) return [];

  const { batchResolveEntitiesFromEmails } = await import("@/lib/crm/communicationResolver");
  const entityMap = await batchResolveEntitiesFromEmails(emailList);

  const { data: suppressed } = await supabase
    .from("crm_suppressions")
    .select("email")
    .in("email", emailList);
  const suppressedSet = new Set((suppressed || []).map((s) => String(s.email).toLowerCase()));

  return emailList
    .filter((email) => !suppressedSet.has(email.toLowerCase()))
    .map((email) => {
      const entity = entityMap.get(email.toLowerCase());
      return {
        email,
        name: entity?.contactName || entity?.entityName || undefined,
        clientId: entity?.clientId || undefined,
        leadId: entity?.leadId || undefined,
        contactId: entity?.contactId || undefined,
      };
    });
}

export async function previewCustomAudienceDetails(rawInput: string): Promise<{
  validCount: number;
  matchedCount: number;
  suppressedCount: number;
  samples: Array<{ email: string; name?: string; matched: boolean; type?: string }>;
}> {
  await requireCrmUser({ page: "campaigns" });
  const supabase = createAdminClient();
  const parsed = parseRawEmailsList(rawInput);
  if (parsed.length === 0) {
    return { validCount: 0, matchedCount: 0, suppressedCount: 0, samples: [] };
  }

  const { batchResolveEntitiesFromEmails } = await import("@/lib/crm/communicationResolver");
  const entityMap = await batchResolveEntitiesFromEmails(parsed);

  const { data: suppressed } = await supabase
    .from("crm_suppressions")
    .select("email")
    .in("email", parsed);
  const suppressedSet = new Set((suppressed || []).map((s) => String(s.email).toLowerCase()));

  let matchedCount = 0;
  let suppressedCount = 0;

  const samples: Array<{ email: string; name?: string; matched: boolean; type?: string }> = [];

  for (let i = 0; i < parsed.length; i++) {
    const email = parsed[i];
    const isSuppressed = suppressedSet.has(email);
    if (isSuppressed) suppressedCount++;

    const entity = entityMap.get(email);
    const isMatched = !!(entity && (entity.clientId || entity.leadId || entity.contactId));
    if (isMatched) matchedCount++;

    if (i < 8) {
      let type: string | undefined;
      if (entity?.clientId) type = "Client";
      else if (entity?.leadId) type = "Lead";
      else if (entity?.contactId) type = "Contact";

      samples.push({
        email,
        name: entity?.contactName || entity?.entityName,
        matched: isMatched,
        type,
      });
    }
  }

  return {
    validCount: parsed.length,
    matchedCount,
    suppressedCount,
    samples,
  };
}

async function resolveAudience(supabase: ReturnType<typeof createAdminClient>, audience: Audience) {
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
    if (audience.tags && audience.tags.length > 0) clientsQuery = clientsQuery.overlaps("tags", audience.tags);
    const { data: clientsData } = await clientsQuery;
    (clientsData || []).forEach((c) => rows.push({ ...c, isClient: true }));
  }

  if (audience.segment === "all" || audience.segment === "leads") {
    let leadsQuery = supabase.from("crm_leads").select("id, name, email, company, phone, tags, current_stage_key").not("email", "is", null);
    if (audience.tags && audience.tags.length > 0) leadsQuery = leadsQuery.overlaps("tags", audience.tags);
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
  await requireCrmUser({ page: "campaigns" });
  const supabase = createAdminClient();
  const recipients = await resolveAudience(supabase, audience);
  return { count: recipients.length };
}

export async function uploadCampaignImage(formData: FormData): Promise<{ success: true; url: string } | { error: string }> {
  await requireCrmUser({ page: "campaigns", action: "campaigns_send" });
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

export async function uploadCampaignDocument(formData: FormData): Promise<
  | { success: true; url: string; fileName: string; fileSizeFormatted: string; extension: string }
  | { error: string }
> {
  await requireCrmUser({ page: "campaigns", action: "campaigns_send" });
  const adminDb = createAdminClient();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { error: "No document file provided." };

  const fileName = file.name || "document";
  const ext = fileName.split(".").pop()?.toLowerCase() || "pdf";

  const allowedExtensions = new Set([
    "pdf",
    "doc",
    "docx",
    "txt",
    "rtf",
    "odt",
    "xlsx",
    "xls",
    "csv",
    "pptx",
    "ppt",
  ]);

  if (!allowedExtensions.has(ext)) {
    return {
      error: `Invalid file type (.${ext}). Supported document types: PDF, DOC, DOCX, TXT, RTF, XLSX, PPTX.`,
    };
  }

  // Max 20MB document size
  if (file.size > 20 * 1024 * 1024) {
    return { error: "Document file size must be less than 20MB." };
  }

  const cleanBaseName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);

  const path = `campaigns/docs/${Date.now()}-${cleanBaseName}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await adminDb.storage
    .from("assets")
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = adminDb.storage.from("assets").getPublicUrl(path);

  // Format file size
  let fileSizeFormatted = `${(file.size / 1024).toFixed(0)} KB`;
  if (file.size >= 1024 * 1024) {
    fileSizeFormatted = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return {
    success: true,
    url: publicUrl,
    fileName,
    fileSizeFormatted,
    extension: ext.toUpperCase(),
  };
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
  await requireCrmUser({ page: "campaigns", action: "campaigns_send" });

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
  await requireCrmUser({ page: "campaigns", action: "campaigns_send" });
  const supabase = createAdminClient();

  const draftId = (formData.get("draftId") as string) || null;
  const subject = (formData.get("subject") as string)?.trim() || "(Untitled Draft)";
  const html = (formData.get("html") as string) || "";
  const mode = (formData.get("mode") as string) || "bulk";
  const customEmailsRaw = (formData.get("customEmails") as string) || "";
  const segment = (formData.get("segment") as "clients" | "leads" | "all") || "leads";
  const stageKey = (formData.get("stageKey") as string) || "";
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];

  const customEmails = parseRawEmailsList(customEmailsRaw);
  const isCustomMode = mode === "custom";

  const audience: Audience = isCustomMode
    ? { customEmails }
    : { segment, tags, stageKey };

  const kind = isCustomMode ? "custom" : "bulk";

  if (draftId) {
    const { error } = await supabase
      .from("crm_email_campaigns")
      .update({
        subject,
        html,
        audience,
        kind,
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
        kind,
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
  await requireCrmUser({ page: "campaigns", action: "campaigns_send" });
  const supabase = createAdminClient();

  const draftId = (formData.get("draftId") as string) || null;
  const subject = (formData.get("subject") as string)?.trim();
  const html = formData.get("html") as string;
  const mode = (formData.get("mode") as string) || "bulk";
  const customEmailsRaw = (formData.get("customEmails") as string) || "";
  const segment = (formData.get("segment") as "clients" | "leads" | "all") || "leads";
  const stageKey = (formData.get("stageKey") as string) || "";
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];
  const scheduledAt = (formData.get("scheduledAt") as string)?.trim() || null;

  if (!subject || !html) return { error: "Subject and message are required." };

  const isCustomMode = mode === "custom";
  const kind = isCustomMode ? "custom" : "bulk";

  let recipients: Array<{
    email: string;
    name?: string;
    company?: string | null;
    phone?: string | null;
    clientId?: string;
    leadId?: string;
    contactId?: string;
  }> = [];

  let audience: Audience;

  if (isCustomMode) {
    const customEmails = parseRawEmailsList(customEmailsRaw);
    if (customEmails.length === 0) {
      return { error: "Please enter at least one valid recipient email address." };
    }
    audience = { customEmails };
    recipients = await resolveCustomAudience(supabase, customEmails);
  } else {
    audience = { segment, tags, stageKey };
    recipients = await resolveAudience(supabase, audience);
  }

  if (recipients.length === 0) return { error: "No recipients match that audience or all are suppressed." };

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
        kind,
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
          kind,
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

/**
 * Delete a single campaign and its associated events
 */
export async function deleteCampaign(campaignId: string): Promise<ActionResult> {
  await requireCrmUser({ page: "campaigns", action: "campaigns_send" });
  const supabase = createAdminClient();

  // Delete associated events first if cascade is not set
  await supabase.from("crm_email_events").delete().eq("campaign_id", campaignId);
  const { error } = await supabase.from("crm_email_campaigns").delete().eq("id", campaignId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/crm/campaigns");
  return { success: true };
}

/**
 * Batch delete multiple campaigns
 */
export async function batchDeleteCampaigns(campaignIds: string[]): Promise<ActionResult> {
  if (!campaignIds || campaignIds.length === 0) return { success: true };
  await requireCrmUser({ page: "campaigns", action: "campaigns_send" });
  const supabase = createAdminClient();

  await supabase.from("crm_email_events").delete().in("campaign_id", campaignIds);
  const { error } = await supabase.from("crm_email_campaigns").delete().in("id", campaignIds);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/crm/campaigns");
  return { success: true };
}
