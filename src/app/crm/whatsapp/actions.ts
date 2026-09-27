"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import { sendWhatsAppMessage } from "@/lib/crm/green-api";
import { processBulkWhatsAppJobBatch } from "@/lib/crm/jobs";
import type { ActionResult } from "@/lib/crm/types";

type SendResult = { success: true; warning?: string } | { error: string };

export async function sendSingleWhatsApp(formData: FormData): Promise<SendResult> {
  const supabase = await requireAdmin();

  const phone = (formData.get("phone") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();
  const clientId = (formData.get("clientId") as string) || null;
  const leadId = (formData.get("leadId") as string) || null;

  if (!phone || !message) return { error: "Phone number and message are required." };

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

  revalidatePath("/crm/whatsapp");
  if (clientId) revalidatePath(`/crm/clients/${clientId}`);
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);

  if (logError) {
    return { success: true, warning: `Sent, but couldn't save it to the activity log: ${logError.message}` };
  }
  return { success: true };
}

type Audience = { segment: "clients" | "leads"; tags: string[]; stageKey: string };

async function resolveWhatsAppAudience(supabase: Awaited<ReturnType<typeof requireAdmin>>, audience: Audience) {
  const table = audience.segment === "clients" ? "crm_clients" : "crm_leads";
  let query = supabase.from(table).select("id, name, phone").not("phone", "is", null);
  if (audience.tags.length > 0) query = query.overlaps("tags", audience.tags);
  if (audience.segment === "leads" && audience.stageKey) query = query.eq("current_stage_key", audience.stageKey);

  const { data } = await query;
  return (data || [])
    .filter((r) => r.phone)
    .map((r) => ({
      phone: r.phone as string,
      name: r.name as string,
      clientId: audience.segment === "clients" ? r.id : undefined,
      leadId: audience.segment === "leads" ? r.id : undefined,
    }));
}

export async function previewWhatsAppAudienceCount(audience: Audience): Promise<{ count: number }> {
  const supabase = await requireAdmin();
  const recipients = await resolveWhatsAppAudience(supabase, audience);
  return { count: recipients.length };
}

export async function createBulkWhatsApp(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const message = (formData.get("message") as string)?.trim();
  const segment = (formData.get("segment") as "clients" | "leads") || "leads";
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
