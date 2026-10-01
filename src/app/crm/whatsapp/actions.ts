"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireCrmUser } from "@/lib/crm/auth";
import { sendWhatsAppMessage } from "@/lib/crm/green-api";
import { processBulkWhatsAppJobBatch } from "@/lib/crm/jobs";
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

  // De-duplicate if someone is both in clients & leads when 'all' is selected
  const seenPhones = new Set<string>();
  const uniqueRows: typeof rows = [];
  for (const r of rows) {
    if (!r.phone) continue;
    const cleanPhone = r.phone.replace(/[^\d]/g, "");
    if (!cleanPhone || seenPhones.has(cleanPhone)) continue;
    seenPhones.add(cleanPhone);
    uniqueRows.push(r);
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
  const segment = (formData.get("segment") as "clients" | "leads" | "all") || "leads";
  const stageKey = (formData.get("stageKey") as string) || "";
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];

  if (!message) return { error: "Message is required." };

  const recipients = await resolveWhatsAppAudience(supabase, { segment, tags, stageKey });
  if (recipients.length === 0) return { error: "No recipients with a phone number match that audience." };

  const { data: job, error: jobError } = await supabase
    .from("crm_jobs")
    .insert([{ type: "bulk_whatsapp", status: "processing", payload: { recipients, message }, total: recipients.length, progress: 0 }])
    .select("*")
    .single();
  if (jobError || !job) return { error: jobError?.message || "Could not queue the send." };

  await processBulkWhatsAppJobBatch(supabase, job as never);

  revalidatePath("/crm/whatsapp");
  revalidatePath("/crm/monitoring");
  return { success: true };
}
