"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireCrmUser } from "@/lib/crm/auth";
import { sendWhatsAppMessage } from "@/lib/crm/whatsapp";
import { processBulkWhatsAppJobBatch, triggerCrmDrainAsync } from "@/lib/crm/jobs";
import type { ActionResult } from "@/lib/crm/types";

type SendResult = { success: true; warning?: string } | { error: string };

export async function sendSingleWhatsApp(formData: FormData): Promise<SendResult> {
  await requireCrmUser({ page: "whatsapp", action: "whatsapp_send" });
  const supabase = createAdminClient();

  const phone = (formData.get("phone") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();
  let clientId = (formData.get("clientId") as string) || null;
  let leadId = (formData.get("leadId") as string) || null;

  if (!phone || !message) return { error: "Phone number and message are required." };

  const { resolveEntityFromPhone, autoPromoteLeadToContacted } = await import("@/lib/crm/communicationResolver");

  // If clientId or leadId were not prefilled, auto-resolve them from the phone number
  if (!clientId && !leadId) {
    const resolved = await resolveEntityFromPhone(phone);
    clientId = resolved.clientId;
    leadId = resolved.leadId;
  }

  const result = await sendWhatsAppMessage({ phone, message });

  const { error: logError } = await supabase.from("crm_whatsapp_events").insert([
    {
      client_id: clientId,
      lead_id: leadId,
      direction: "outbound",
      phone,
      message,
      status: "error" in result ? "failed" : "sent",
      provider_message_id: "messageId" in result ? result.messageId : null,
    },
  ]);

  if ("error" in result) return { error: result.error };

  // If a lead received this WhatsApp message, automatically promote to 'contacted' if currently in 'lead' stage
  if (leadId) {
    await autoPromoteLeadToContacted(leadId);
  }

  revalidatePath("/crm/whatsapp");
  revalidatePath("/crm/leads");
  if (clientId) revalidatePath(`/crm/clients/${clientId}`);
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);

  if (logError) {
    return { success: true, warning: `Sent, but couldn't save it to the activity log: ${logError.message}` };
  }
  return { success: true };
}

import { normalizeE164Phone, parseRawPhoneInput } from "@/lib/crm/phone";

export type CustomWhatsAppRecipient = {
  phone: string;
  name?: string;
  rawInput: string;
  isValid: boolean;
  matchedEntity?: {
    type: "lead" | "client" | "contact";
    name: string;
    clientId?: string;
    leadId?: string;
  };
  isSuppressed?: boolean;
};

export async function previewCustomWhatsAppAudience(rawInput: string): Promise<{
  validCount: number;
  matchedCount: number;
  suppressedCount: number;
  samples: Array<{ phone: string; name?: string; matched: boolean; type?: string; error?: string }>;
}> {
  await requireCrmUser({ page: "whatsapp" });
  const entries = parseRawPhoneInput(rawInput);
  if (entries.length === 0) {
    return { validCount: 0, matchedCount: 0, suppressedCount: 0, samples: [] };
  }

  const supabase = createAdminClient();
  const normalizedPhones: string[] = [];
  const normalizedEntries: Array<{ original: { phone: string; name?: string }; normalized: string | null }> = [];

  for (const item of entries) {
    const norm = normalizeE164Phone(item.phone);
    if (norm) normalizedPhones.push(norm);
    normalizedEntries.push({ original: item, normalized: norm });
  }

  const { batchResolveEntitiesFromPhones } = await import("@/lib/crm/communicationResolver");
  const entityMap = await batchResolveEntitiesFromPhones(normalizedPhones);

  // Check suppressions
  const { data: suppressed } = await supabase
    .from("crm_suppressions")
    .select("email")
    .in("email", normalizedPhones);
  const suppressedSet = new Set((suppressed || []).map((s) => String(s.email).toLowerCase()));

  let validCount = 0;
  let matchedCount = 0;
  let suppressedCount = 0;
  const samples: Array<{ phone: string; name?: string; matched: boolean; type?: string; error?: string }> = [];

  for (const entry of normalizedEntries) {
    if (!entry.normalized) {
      if (samples.length < 8) {
        samples.push({
          phone: entry.original.phone,
          matched: false,
          error: "Invalid phone format",
        });
      }
      continue;
    }

    validCount++;
    const isSuppressed = suppressedSet.has(entry.normalized);
    if (isSuppressed) suppressedCount++;

    const entity = entityMap.get(entry.normalized);
    const hasMatch = Boolean(entity && (entity.clientId || entity.leadId || entity.contactId));
    if (hasMatch) matchedCount++;

    if (samples.length < 8) {
      const type = entity?.clientId ? "client" : entity?.leadId ? "lead" : entity?.contactId ? "contact" : undefined;
      samples.push({
        phone: entry.normalized,
        name: entry.original.name || entity?.contactName || entity?.entityName,
        matched: hasMatch,
        type,
        error: isSuppressed ? "Opted-out (Suppressed)" : undefined,
      });
    }
  }

  return { validCount, matchedCount, suppressedCount, samples };
}

type Audience = { segment: "clients" | "leads" | "all"; tags: string[]; stageKey: string };

async function resolveWhatsAppAudience(supabase: ReturnType<typeof createAdminClient>, audience: Audience) {
  const rows: Array<{
    id: string;
    name: string;
    phone: string | null;
    clientId?: string;
    leadId?: string;
  }> = [];

  if (audience.segment === "all" || audience.segment === "clients") {
    let clientsQuery = supabase.from("crm_clients").select("id, name, phone, tags").not("phone", "is", null);
    if (audience.tags.length > 0) clientsQuery = clientsQuery.overlaps("tags", audience.tags);
    const { data: clientsData } = await clientsQuery;
    (clientsData || []).forEach((c) => rows.push({ ...c, clientId: c.id }));
  }

  if (audience.segment === "all" || audience.segment === "leads") {
    let leadsQuery = supabase.from("crm_leads").select("id, name, phone, tags, current_stage_key").not("phone", "is", null);
    if (audience.tags.length > 0) leadsQuery = leadsQuery.overlaps("tags", audience.tags);
    if (audience.stageKey && audience.segment === "leads") leadsQuery = leadsQuery.eq("current_stage_key", audience.stageKey);
    const { data: leadsData } = await leadsQuery;
    (leadsData || []).forEach((l) => rows.push({ ...l, leadId: l.id }));
  }

  // Fetch suppressions
  const { data: suppressed } = await supabase.from("crm_suppressions").select("email");
  const suppressedSet = new Set((suppressed || []).map((s) => String(s.email).toLowerCase()));

  // De-duplicate & normalize phone numbers
  const seenPhones = new Set<string>();
  const uniqueRows: typeof rows = [];
  for (const r of rows) {
    const normalized = normalizeE164Phone(r.phone);
    if (!normalized || seenPhones.has(normalized) || suppressedSet.has(normalized)) continue;
    seenPhones.add(normalized);
    uniqueRows.push({ ...r, phone: normalized });
  }

  return uniqueRows.map((r) => ({
    phone: r.phone as string,
    name: r.name as string,
    clientId: r.clientId,
    leadId: r.leadId,
  }));
}

export async function previewWhatsAppAudienceCount(audience: Audience): Promise<{ count: number }> {
  await requireCrmUser({ page: "whatsapp" });
  const supabase = createAdminClient();
  const recipients = await resolveWhatsAppAudience(supabase, audience);
  return { count: recipients.length };
}

export async function createBulkWhatsApp(formData: FormData): Promise<ActionResult> {
  await requireCrmUser({ page: "whatsapp", action: "whatsapp_send" });
  const supabase = createAdminClient();

  const message = (formData.get("message") as string)?.trim();
  const sendMode = (formData.get("sendMode") as string) || "bulk"; // "bulk" (audience) or "custom"
  const customPhonesRaw = (formData.get("customPhones") as string)?.trim();
  const segment = (formData.get("segment") as "clients" | "leads" | "all") || "leads";
  const stageKey = (formData.get("stageKey") as string) || "";
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];

  if (!message) return { error: "Message is required." };

  let recipients: Array<{ phone: string; name?: string; clientId?: string; leadId?: string }> = [];

  if (sendMode === "custom") {
    if (!customPhonesRaw) return { error: "Please paste recipient phone numbers for custom batch." };
    const parsedEntries = parseRawPhoneInput(customPhonesRaw);
    if (parsedEntries.length === 0) return { error: "No valid recipient numbers found in pasted input." };

    const normalizedPhones: string[] = [];
    const validPairs: Array<{ phone: string; name?: string }> = [];
    const seen = new Set<string>();

    for (const item of parsedEntries) {
      const norm = normalizeE164Phone(item.phone);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        normalizedPhones.push(norm);
        validPairs.push({ phone: norm, name: item.name });
      }
    }

    if (validPairs.length === 0) return { error: "None of the pasted numbers were valid phone numbers." };

    // Filter suppressions
    const { data: suppressed } = await supabase.from("crm_suppressions").select("email").in("email", normalizedPhones);
    const suppressedSet = new Set((suppressed || []).map((s) => String(s.email).toLowerCase()));

    const { batchResolveEntitiesFromPhones } = await import("@/lib/crm/communicationResolver");
    const entityMap = await batchResolveEntitiesFromPhones(normalizedPhones);

    recipients = validPairs
      .filter((p) => !suppressedSet.has(p.phone))
      .map((p) => {
        const entity = entityMap.get(p.phone);
        return {
          phone: p.phone,
          name: p.name || entity?.contactName || entity?.entityName || undefined,
          clientId: entity?.clientId || undefined,
          leadId: entity?.leadId || undefined,
        };
      });
  } else {
    recipients = await resolveWhatsAppAudience(supabase, { segment, tags, stageKey });
  }

  if (recipients.length === 0) {
    return { error: "No viable, non-suppressed recipients with a phone number match that audience." };
  }

  const { data: job, error: jobError } = await supabase
    .from("crm_jobs")
    .insert([
      {
        type: "bulk_whatsapp",
        status: "queued",
        payload: { recipients, message, recipientResults: [] },
        total: recipients.length,
        progress: 0,
      },
    ])
    .select("*")
    .single();

  if (jobError || !job) return { error: jobError?.message || "Could not queue the send." };

  // Trigger automatic self-draining loop in the background
  triggerCrmDrainAsync(1000);

  revalidatePath("/crm/whatsapp");
  revalidatePath("/crm/monitoring");
  return { success: true };
}
