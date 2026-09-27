import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/brevo";
import { sendWhatsAppMessage } from "@/lib/crm/green-api";
import type { CrmJourneyStage } from "@/lib/crm/types";

const IMPORT_BATCH_SIZE = 200;
const BULK_SEND_BATCH_SIZE = 20;
const BULK_WHATSAPP_BATCH_SIZE = 10;

type ImportPayload = {
  targetType: "client" | "lead";
  mapping: Record<string, string>; // crmField -> spreadsheet header
  dedupStrategy: "skip" | "overwrite" | "merge";
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

  const records = batch.map((row) => buildRecordFromRow(row, mapping));
  for (const record of records) {
    if (typeof record.email === "string" && !EMAIL_RE.test(record.email)) delete record.email;
  }
  const emails = records.map((r) => (typeof r.email === "string" ? r.email.toLowerCase() : null)).filter(Boolean) as string[];

  const existingByEmail = new Map<string, { id: string } & Record<string, unknown>>();
  if (emails.length > 0) {
    const { data: existing } = await supabase.from(table).select("*").in("email", emails);
    for (const row of existing || []) {
      if (row.email) existingByEmail.set(String(row.email).toLowerCase(), row);
    }
  }

  for (const record of records) {
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) {
      stats.skipped++;
      continue;
    }
    const email = typeof record.email === "string" ? record.email.toLowerCase() : null;
    const existing = email ? existingByEmail.get(email) : undefined;

    if (existing) {
      if (dedupStrategy === "skip") {
        stats.skipped++;
        continue;
      }
      if (dedupStrategy === "overwrite") {
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

  return { processed: batch.length, done };
}

type BulkSendPayload = {
  campaignId: string;
  recipients: { email: string; name?: string; clientId?: string; leadId?: string }[];
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

  let sentCount = 0;
  for (const recipient of batch) {
    if (suppressedSet.has(recipient.email.toLowerCase())) continue;

    const personalizedHtml = html.replace(/\{\{\s*first_name\s*\}\}/gi, recipient.name?.split(" ")[0] || "there");
    const result = await sendEmail({ to: [{ email: recipient.email, name: recipient.name }], subject, htmlContent: personalizedHtml });

    const { error: logError } = await supabase.from("crm_email_events").insert([
      {
        campaign_id: campaignId,
        client_id: recipient.clientId || null,
        lead_id: recipient.leadId || null,
        recipient_email: recipient.email,
        type: "error" in result ? "error" : "sent",
        message_id: "messageId" in result ? result.messageId : null,
        meta: "error" in result ? { error: result.error } : {},
      },
    ]);
    if (logError) console.error(`crm_email_events insert failed for ${recipient.email}:`, logError.message);
    if (!("error" in result)) sentCount++;
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

type BulkWhatsAppPayload = {
  recipients: { phone: string; name?: string; clientId?: string; leadId?: string }[];
  message: string;
};

export async function processBulkWhatsAppJobBatch(
  supabase: SupabaseClient,
  job: { id: string; payload: BulkWhatsAppPayload; progress: number; total: number }
): Promise<{ processed: number; done: boolean }> {
  const { recipients, message } = job.payload;
  const batch = recipients.slice(job.progress, job.progress + BULK_WHATSAPP_BATCH_SIZE);

  if (batch.length === 0) {
    await supabase.from("crm_jobs").update({ status: "done", progress: job.total, updated_at: new Date().toISOString() }).eq("id", job.id);
    return { processed: 0, done: true };
  }

  for (const recipient of batch) {
    const personalized = message.replace(/\{\{\s*first_name\s*\}\}/gi, recipient.name?.split(" ")[0] || "there");
    const result = await sendWhatsAppMessage({ phone: recipient.phone, message: personalized });
    const { error: logError } = await supabase.from("crm_whatsapp_events").insert([
      {
        client_id: recipient.clientId || null,
        lead_id: recipient.leadId || null,
        direction: "outbound",
        phone: recipient.phone,
        message: personalized,
        status: "error" in result ? "failed" : "sent",
        provider_message_id: "messageId" in result ? result.messageId : null,
      },
    ]);
    if (logError) console.error(`crm_whatsapp_events insert failed for ${recipient.phone}:`, logError.message);
    // Space sends out — GREEN-API/WhatsApp penalizes rapid-fire bulk messages.
    await new Promise((r) => setTimeout(r, 1200));
  }

  const newProgress = job.progress + batch.length;
  const done = newProgress >= job.total;
  await supabase
    .from("crm_jobs")
    .update({ progress: newProgress, status: done ? "done" : "queued", updated_at: new Date().toISOString() })
    .eq("id", job.id);

  return { processed: batch.length, done };
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
export async function drainCrmJobs(supabase: SupabaseClient): Promise<{ jobsTouched: number }> {
  const { data: jobs } = await supabase
    .from("crm_jobs")
    .select("*")
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: true })
    .limit(20);

  if (!jobs || jobs.length === 0) return { jobsTouched: 0 };

  const { data: settings } = await supabase.from("crm_settings").select("brevo_daily_cap").eq("id", "default").maybeSingle();
  const dailyCap = settings?.brevo_daily_cap ?? 300;
  const sentToday = await getTodaysSentEmailCount(supabase);
  let remainingCap = Math.max(0, dailyCap - sentToday);

  for (const job of jobs) {
    if (job.status === "queued") {
      await supabase.from("crm_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", job.id);
    }
    if (job.type === "import") {
      await processImportJobBatch(supabase, job as never);
    } else if (job.type === "bulk_send") {
      const result = await processBulkSendJobBatch(supabase, job as never, remainingCap);
      remainingCap -= result.processed;
    } else if (job.type === "bulk_whatsapp") {
      await processBulkWhatsAppJobBatch(supabase, job as never);
    }
  }

  return { jobsTouched: jobs.length };
}
