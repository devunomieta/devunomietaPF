import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/brevo";
import { sendWhatsAppMessage } from "@/lib/crm/whatsapp";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { personalizeText } from "@/lib/crm/personalization";
import { spinText } from "@/lib/crm/spintax";

const IMPORT_BATCH_SIZE = 200;
const BULK_SEND_BATCH_SIZE = 20;
const BULK_WHATSAPP_BATCH_SIZE = 10;

type ImportPayload = {
  targetType: "client" | "lead";
  mapping: Record<string, string>; // crmField -> spreadsheet header
  dedupStrategy: "skip" | "overwrite" | "merge";
  rowOverrides?: Record<number, "skip" | "overwrite" | "merge">; // per-row strategy overrides
  rows: Record<string, string>[];
  stats?: { imported: number; updated: number; skipped: number };
};

function buildRecordFromRow(row: Record<string, string>, mapping: Record<string, string>) {
  const out: Record<string, string | string[] | number> = {};
  for (const [field, header] of Object.entries(mapping)) {
    if (!header) continue;
    const value = row[header]?.trim() ?? "";
    if (!value) continue;
    if (field === "tags") out.tags = value.split(/[;,]/).map((t) => t.trim()).filter(Boolean);
    else if (field === "score") out.score = parseInt(value) || 0;
    else out[field] = value;
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function processImportJobBatch(
  supabase: SupabaseClient,
  job: { id: string; payload: ImportPayload; progress: number; total: number }
): Promise<{ processed: number; done: boolean; error?: string }> {
  const { targetType, mapping, dedupStrategy, rows } = job.payload;
  const stats = job.payload.stats || { imported: 0, updated: 0, skipped: 0 };

  const batch = rows.slice(job.progress, job.progress + IMPORT_BATCH_SIZE);
  if (batch.length === 0) {
    await supabase.from("crm_jobs").update({ status: "done", progress: job.total, updated_at: new Date().toISOString() }).eq("id", job.id);
    return { processed: 0, done: true };
  }

  const table = targetType === "client" ? "crm_clients" : "crm_leads";

  let defaultJourney: { id: string; stages: CrmJourneyStage[] } | null = null;
  if (targetType === "lead") {
    const { data } = await supabase.from("crm_journeys").select("id, stages").eq("is_default", true).maybeSingle();
    defaultJourney = data as { id: string; stages: CrmJourneyStage[] } | null;
  }
  const firstStage = defaultJourney?.stages?.sort((a, b) => a.position - b.position)[0];

  function cleanPhone(raw: unknown): string {
    if (!raw) return "";
    return String(raw).replace(/[^\d+]/g, "").trim();
  }

  const records = batch.map((row) => buildRecordFromRow(row, mapping));
  for (const record of records) {
    if (typeof record.email === "string" && !EMAIL_RE.test(record.email)) delete record.email;
  }

  // Pre-fetch candidate records from database for this table
  // to perform fast, robust multi-field matching
  const { data: allExisting } = await supabase.from(table).select("*");
  
  const existingByEmail = new Map<string, { id: string } & Record<string, unknown>>();
  const existingByPhone = new Map<string, { id: string } & Record<string, unknown>>();
  const existingByNameCompany = new Map<string, { id: string } & Record<string, unknown>>();

  for (const row of allExisting || []) {
    if (row.email) {
      existingByEmail.set(String(row.email).trim().toLowerCase(), row);
    }
    const ph = cleanPhone(row.phone);
    if (ph && ph.length >= 7) {
      existingByPhone.set(ph, row);
      existingByPhone.set(ph.replace(/^\+/, ""), row);
    }
    const n = String(row.name || "").trim().toLowerCase();
    const c = String(row.company || "").trim().toLowerCase();
    if (n) {
      existingByNameCompany.set(`${n}:::${c}`, row);
    }
  }

  const rowOverrides = job.payload.rowOverrides || {};

  for (let bIdx = 0; bIdx < records.length; bIdx++) {
    const record = records[bIdx];
    const globalRowIndex = job.progress + bIdx;
    const effectiveStrategy = rowOverrides[globalRowIndex] || dedupStrategy;

    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) {
      stats.skipped++;
      continue;
    }
    const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : null;
    const phone = typeof record.phone === "string" ? cleanPhone(record.phone) : null;
    const company = typeof record.company === "string" ? record.company.trim().toLowerCase() : "";
    const nameLower = name.toLowerCase();

    // Multi-field matching priority:
    // 1. Email match
    // 2. Phone match (normalized digits)
    // 3. Name + Company match (or Name alone if both have no company)
    let existing: ({ id: string } & Record<string, unknown>) | undefined;

    if (email && existingByEmail.has(email)) {
      existing = existingByEmail.get(email);
    } else if (phone && (existingByPhone.has(phone) || existingByPhone.has(phone.replace(/^\+/, "")))) {
      existing = existingByPhone.get(phone) || existingByPhone.get(phone.replace(/^\+/, ""));
    } else if (nameLower && company && existingByNameCompany.has(`${nameLower}:::${company}`)) {
      existing = existingByNameCompany.get(`${nameLower}:::${company}`);
    } else if (nameLower && !company && existingByNameCompany.has(`${nameLower}:::`)) {
      existing = existingByNameCompany.get(`${nameLower}:::`);
    }

    if (existing) {
      if (effectiveStrategy === "skip") {
        stats.skipped++;
        continue;
      }
      if (effectiveStrategy === "overwrite") {
        await supabase.from(table).update(record).eq("id", existing.id);
        stats.updated++;
        continue;
      }
      // merge: only fill fields that are currently empty on the existing record
      const merged: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(record)) {
        const currentValue = existing[key];
        if (currentValue === null || currentValue === undefined || currentValue === "" || (Array.isArray(currentValue) && currentValue.length === 0)) {
          merged[key] = value;
        }
      }
      if (Object.keys(merged).length > 0) {
        await supabase.from(table).update(merged).eq("id", existing.id);
      }
      stats.updated++;
      continue;
    }

    const insertData: Record<string, unknown> = { ...record, source: "import" };
    if (targetType === "lead") {
      insertData.journey_id = defaultJourney?.id || null;
      insertData.current_stage_key = firstStage?.key || "lead";
    }
    const { error } = await supabase.from(table).insert([insertData]);
    if (error) {
      stats.skipped++;
    } else {
      stats.imported++;
    }
  }

  const newProgress = job.progress + batch.length;
  const done = newProgress >= job.total;

  await supabase
    .from("crm_jobs")
    .update({
      progress: newProgress,
      status: done ? "done" : "queued",
      payload: { ...job.payload, stats },
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  if (done) {
    try {
      const { createCrmNotification } = await import("@/lib/crm/notifications");
      await createCrmNotification({
        title: `Bulk ${targetType === "client" ? "Clients" : "Leads"} Import Complete`,
        message: `Imported ${stats.imported}, updated ${stats.updated}, skipped ${stats.skipped} out of ${job.total} records.`,
        category: "monitoring",
        severity: "success",
        required_page_permission: "import",
        link_url: targetType === "client" ? "/crm/clients" : "/crm/leads",
        group_key: `import_${job.id}`,
      });
    } catch (e) {
      console.warn("Could not dispatch job notification:", e);
    }
  }

  return { processed: batch.length, done };
}

type BulkSendPayload = {
  campaignId: string;
  recipients: { email: string; name?: string; clientId?: string; leadId?: string; contactId?: string }[];
  subject: string;
  html: string;
};

export async function processBulkSendJobBatch(
  supabase: SupabaseClient,
  job: { id: string; payload: BulkSendPayload; progress: number; total: number },
  remainingDailyCap: number
): Promise<{ processed: number; done: boolean }> {
  const { campaignId, recipients, subject, html } = job.payload;
  const limit = Math.max(0, Math.min(BULK_SEND_BATCH_SIZE, remainingDailyCap));

  if (limit === 0) {
    return { processed: 0, done: false };
  }

  const batch = recipients.slice(job.progress, job.progress + limit);
  if (batch.length === 0) {
    await supabase.from("crm_jobs").update({ status: "done", progress: job.total, updated_at: new Date().toISOString() }).eq("id", job.id);
    await supabase.from("crm_email_campaigns").update({ status: "sent" }).eq("id", campaignId);
    return { processed: 0, done: true };
  }

  const { data: suppressed } = await supabase.from("crm_suppressions").select("email").in(
    "email",
    batch.map((r) => r.email.toLowerCase())
  );
  const suppressedSet = new Set((suppressed || []).map((s) => String(s.email).toLowerCase()));

  const { recordCampaignEmailInEntityFeed } = await import("@/lib/crm/communicationResolver");

  let sentCount = 0;
  for (const recipient of batch) {
    if (suppressedSet.has(recipient.email.toLowerCase())) continue;

    const personalizedSubject = personalizeText(subject, recipient);
    const personalizedHtml = personalizeText(html, recipient);
    const result = await sendEmail({ to: [{ email: recipient.email, name: recipient.name }], subject: personalizedSubject, htmlContent: personalizedHtml });

    const messageId = "messageId" in result ? result.messageId : null;

    const { error: logError } = await supabase.from("crm_email_events").insert([
      {
        campaign_id: campaignId,
        client_id: recipient.clientId || null,
        lead_id: recipient.leadId || null,
        recipient_email: recipient.email,
        type: "error" in result ? "error" : "sent",
        message_id: messageId,
        meta: "error" in result ? { error: result.error } : {},
      },
    ]);
    if (logError) console.error(`crm_email_events insert failed for ${recipient.email}:`, logError.message);

    if (!("error" in result)) {
      sentCount++;
      // If this recipient is an existing lead or client contact in the system,
      // record it into crm_threads and crm_messages so it appears in their mail history
      if (recipient.clientId || recipient.leadId) {
        try {
          await recordCampaignEmailInEntityFeed({
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            subject: personalizedSubject,
            htmlContent: personalizedHtml,
            messageId,
            clientId: recipient.clientId,
            leadId: recipient.leadId,
            contactId: recipient.contactId,
          });
        } catch (feedErr) {
          console.error(`Failed to record campaign email in feed for ${recipient.email}:`, feedErr);
        }
      }
    }
  }

  const newProgress = job.progress + batch.length;
  const done = newProgress >= job.total;

  await supabase
    .from("crm_jobs")
    .update({ progress: newProgress, status: done ? "done" : "queued", updated_at: new Date().toISOString() })
    .eq("id", job.id);
  await supabase
    .from("crm_email_campaigns")
    .update({ sent_count: newProgress, status: done ? "sent" : "sending" })
    .eq("id", campaignId);

  return { processed: sentCount, done };
}

export type RecipientResult = {
  phone: string;
  name?: string;
  status: "sent" | "failed";
  error?: string;
  sentAt: string;
  providerMessageId?: string | null;
};

type BulkWhatsAppPayload = {
  recipients: { phone: string; name?: string; clientId?: string; leadId?: string }[];
  message: string;
  recipientResults?: RecipientResult[];
  lastBatchAt?: string;
};

export async function getTodaysSentWhatsAppCount(supabase: SupabaseClient): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("crm_whatsapp_events")
    .select("*", { count: "exact", head: true })
    .eq("direction", "outbound")
    .eq("status", "sent")
    .gte("occurred_at", startOfDay.toISOString());
  return count || 0;
}

export async function processBulkWhatsAppJobBatch(
  supabase: SupabaseClient,
  job: { id: string; payload: BulkWhatsAppPayload; progress: number; total: number },
  remainingDailyCap = 100
): Promise<{ processed: number; done: boolean }> {
  const { recipients, message } = job.payload;
  const recipientResults: RecipientResult[] = job.payload.recipientResults ? [...job.payload.recipientResults] : [];

  if (job.progress >= recipients.length) {
    await supabase.from("crm_jobs").update({ status: "done", progress: job.total, updated_at: new Date().toISOString() }).eq("id", job.id);
    return { processed: 0, done: true };
  }

  if (remainingDailyCap <= 0) {
    console.warn(`[WhatsApp Batch] Daily sending quota reached for job ${job.id}. Will wait for next day.`);
    return { processed: 0, done: false };
  }

  // Slice at most 1 to 2 messages per serverless execution step or up to remainingDailyCap
  // Standard serverless timeout is 60s. 1 msg with 30s-45s jitter safely completes within budget.
  const sliceSize = Math.max(1, Math.min(2, remainingDailyCap));
  const batch = recipients.slice(job.progress, job.progress + sliceSize);

  let sentCount = 0;
  let currentProgress = job.progress;

  for (let i = 0; i < batch.length; i++) {
    // Check if the job was canceled by the user
    const { data: currentJob } = await supabase.from("crm_jobs").select("status").eq("id", job.id).maybeSingle();
    if (currentJob?.status === "canceled") {
      console.log(`[WhatsApp Batch] Job ${job.id} was canceled by user. Stopping processing.`);
      return { processed: sentCount, done: true };
    }

    const recipient = batch[i];

    // 1. Spintax: Each recipient gets a uniquely spun copy of the message template
    const spunMessage = spinText(message);

    // 2. Personalize with {{first_name}}, {{company}}, etc.
    const personalized = personalizeText(spunMessage, recipient);

    const result = await sendWhatsAppMessage({ phone: recipient.phone, message: personalized });
    const isSuccess = !("error" in result);

    const { error: logError } = await supabase.from("crm_whatsapp_events").insert([
      {
        client_id: recipient.clientId || null,
        lead_id: recipient.leadId || null,
        direction: "outbound",
        phone: recipient.phone,
        message: personalized,
        status: isSuccess ? "sent" : "failed",
        provider_message_id: "messageId" in result ? result.messageId : null,
      },
    ]);
    if (logError) {
      console.error(`[WhatsApp Batch] Failed to log event for ${recipient.phone}:`, logError.message);
    }

    if (isSuccess) {
      sentCount++;
      if (recipient.leadId) {
        const { autoPromoteLeadToContacted } = await import("@/lib/crm/communicationResolver");
        await autoPromoteLeadToContacted(recipient.leadId);
      }
    }

    // Record recipient status into ledger
    recipientResults.push({
      phone: recipient.phone,
      name: recipient.name,
      status: isSuccess ? "sent" : "failed",
      error: !isSuccess ? result.error : undefined,
      sentAt: new Date().toISOString(),
      providerMessageId: "messageId" in result ? result.messageId : null,
    });

    currentProgress++;
    const isDone = currentProgress >= job.total;

    // ATOMIC PROGRESS UPDATE: Immediately commit progress after EACH message
    // If the serverless process dies or is killed, it will NEVER resend to this recipient
    await supabase
      .from("crm_jobs")
      .update({
        progress: currentProgress,
        status: isDone ? "done" : "queued",
        payload: {
          ...job.payload,
          recipientResults,
          lastBatchAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    const isQuotaExceeded = !isSuccess && (result.error.includes("Monthly quota has been exceeded") || result.error.includes("466"));

    // If quota or rate limits are hit, pause/fail the job gracefully
    if (isQuotaExceeded) {
      console.warn(`[WhatsApp Batch] Quota/rate limit exceeded. Halting job.`);
      await supabase
        .from("crm_jobs")
        .update({
          progress: currentProgress,
          status: "failed",
          error: "WhatsApp sending rate limit or quota exceeded. Please check bridge status and retry.",
          payload: {
            ...job.payload,
            recipientResults,
            lastBatchAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return { processed: sentCount, done: true };
    }

    if (isDone) {
      return { processed: sentCount, done: true };
    }

    // Apply safe randomized jitter before sending the second message in this slice
    if (i < batch.length - 1) {
      const jitterMs = Math.floor(Math.random() * (25000 - 15000 + 1)) + 15000; // 15s to 25s safe within slice
      console.log(`[WhatsApp Batch] In-slice jitter delay: ${(jitterMs / 1000).toFixed(1)}s`);
      await new Promise((r) => setTimeout(r, jitterMs));
    }
  }

  const done = currentProgress >= job.total;
  return { processed: sentCount, done };
}

export async function getTodaysSentEmailCount(supabase: SupabaseClient): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("crm_email_events")
    .select("*", { count: "exact", head: true })
    .eq("type", "sent")
    .gte("occurred_at", startOfDay.toISOString());
  return count || 0;
}

/** Drains one batch from every queued/processing job. Used by both the cron route and the manual "process now" action. */
export async function drainCrmJobs(supabase: SupabaseClient): Promise<{ jobsTouched: number; remainingJobs?: number }> {
  const { data: jobs } = await supabase
    .from("crm_jobs")
    .select("*")
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: true })
    .limit(20);

  if (!jobs || jobs.length === 0) return { jobsTouched: 0 };

  const { data: settings } = await supabase
    .from("crm_settings")
    .select("brevo_daily_cap, whatsapp_daily_cap, whatsapp_warmup_mode")
    .eq("id", "default")
    .maybeSingle();

  const dailyEmailCap = settings?.brevo_daily_cap ?? 300;
  const sentEmailsToday = await getTodaysSentEmailCount(supabase);
  let remainingEmailCap = Math.max(0, dailyEmailCap - sentEmailsToday);

  // WhatsApp daily cap & warm-up logic
  const defaultWhatsAppCap = settings?.whatsapp_daily_cap ?? 60;
  const sentWhatsAppToday = await getTodaysSentWhatsAppCount(supabase);
  let remainingWhatsAppCap = Math.max(0, defaultWhatsAppCap - sentWhatsAppToday);

  for (const job of jobs) {
    // Check batch wait cooldown for WhatsApp (e.g. 5 minutes between bursts if specified)
    if (job.type === "bulk_whatsapp") {
      const lastBatchAt = job.payload?.lastBatchAt;
      if (lastBatchAt) {
        const elapsedMs = Date.now() - new Date(lastBatchAt).getTime();
        // If less than 20 seconds have elapsed since last send, skip this iteration to allow safe pacing
        if (elapsedMs < 20000) {
          continue;
        }
      }
    }

    if (job.status === "queued") {
      await supabase.from("crm_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", job.id);
    }
    if (job.type === "import") {
      await processImportJobBatch(supabase, job as never);
    } else if (job.type === "bulk_send") {
      const result = await processBulkSendJobBatch(supabase, job as never, remainingEmailCap);
      remainingEmailCap -= result.processed;
    } else if (job.type === "bulk_whatsapp") {
      const result = await processBulkWhatsAppJobBatch(supabase, job as never, remainingWhatsAppCap);
      remainingWhatsAppCap -= result.processed;
    }
  }

  // Check if any jobs remain queued or processing
  const { count: remainingJobsCount } = await supabase
    .from("crm_jobs")
    .select("*", { count: "exact", head: true })
    .in("status", ["queued", "processing"]);

  const hasRemaining = (remainingJobsCount || 0) > 0;

  // SELF-CHAINING ASYNC DRAIN:
  // If jobs still remain, self-trigger next batch in the background after a safe pacing delay
  if (hasRemaining) {
    triggerCrmDrainAsync(25000);
  }

  return { jobsTouched: jobs.length, remainingJobs: remainingJobsCount || 0 };
}

/**
 * Fires an unblocked background trigger to continue draining the CRM job queue.
 * Allows bulk sending and WhatsApp batches to self-drain without waiting for external crons.
 */
export function triggerCrmDrainAsync(delayMs: number = 0) {
  setTimeout(async () => {
    try {
      const cronSecret = process.env.CRON_SECRET;
      // Derive baseUrl from standard Vercel environment variables or fallback to production domain
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.devunomieta.xyz");

      const endpoint = `${baseUrl}/api/cron/crm-jobs`;
      await fetch(endpoint, {
        method: "GET",
        headers: {
          ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
        },
      });
    } catch (err) {
      console.warn("[Self-Chaining Drain] Background trigger dispatch notice:", err);
    }
  }, delayMs);
}
