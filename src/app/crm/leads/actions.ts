"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireCrmUser } from "@/lib/crm/auth";
import type { ActionResult, CrmJourneyStage } from "@/lib/crm/types";

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function getDefaultJourney(supabase: ReturnType<typeof createAdminClient>) {
  const { data } = await supabase.from("crm_journeys").select("*").eq("is_default", true).maybeSingle();
  return data as { id: string; stages: CrmJourneyStage[] } | null;
}

export async function saveLead(formData: FormData, id?: string): Promise<ActionResult> {
  await requireCrmUser({ page: "leads", action: "leads_edit" });
  const supabase = createAdminClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required." };

  const leadData = {
    name,
    email: (formData.get("email") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    company: (formData.get("company") as string)?.trim() || null,
    location: (formData.get("location") as string)?.trim() || null,
    website: (formData.get("website") as string)?.trim() || null,
    pain_points: (formData.get("pain_points") as string)?.trim() || null,
    proposed_solution: (formData.get("proposed_solution") as string)?.trim() || null,
    score: parseInt(formData.get("score") as string) || 0,
    tags: parseTags(formData.get("tags")),
    notes: (formData.get("notes") as string)?.trim() || null,
  };

  let error;
  if (id) {
    ({ error } = await supabase.from("crm_leads").update(leadData).eq("id", id));
  } else {
    const journey = await getDefaultJourney(supabase);
    const firstStage = journey?.stages?.sort((a, b) => a.position - b.position)[0];
    ({ error } = await supabase.from("crm_leads").insert([
      {
        ...leadData,
        source: "manual",
        journey_id: journey?.id || null,
        current_stage_key: firstStage?.key || "lead",
      },
    ]));
  }

  if (error) return { error: error.message };

  revalidatePath("/crm/leads");
  return { success: true };
}

export async function deleteLead(id: string): Promise<ActionResult> {
  await requireCrmUser({ page: "leads", action: "leads_delete" });
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_leads").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        error: "Cannot delete this lead because other records (such as converted clients or emails) are linked to it.",
      };
    }
    return { error: error.message };
  }
  revalidatePath("/crm/leads");
  return { success: true };
}

async function promoteLeadToClient(
  supabase: ReturnType<typeof createAdminClient>,
  lead: { id: string; name: string; email: string | null; phone: string | null; company: string | null; location?: string | null; website?: string | null; pain_points?: string | null; proposed_solution?: string | null; tags: string[]; notes: string | null }
) {
  const { data: client, error: clientError } = await supabase
    .from("crm_clients")
    .insert([
      {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        location: lead.location || null,
        website: lead.website || null,
        pain_points: lead.pain_points || null,
        proposed_solution: lead.proposed_solution || null,
        tags: lead.tags,
        notes: lead.notes,
        source: "lead_conversion",
      },
    ])
    .select("id")
    .single();

  if (clientError) return { error: clientError.message };

  const { error: leadError } = await supabase
    .from("crm_leads")
    .update({ status: "won", converted_to_client_id: client.id })
    .eq("id", lead.id);

  if (leadError) return { error: leadError.message };
  return { success: true as const, clientId: client.id as string };
}

export async function moveLeadStage(leadId: string, stageKey: string, note?: string): Promise<ActionResult & { clientId?: string }> {
  await requireCrmUser({ page: "leads", action: "leads_edit" });
  const supabase = createAdminClient();

  const { data: lead, error: leadFetchError } = await supabase.from("crm_leads").select("*").eq("id", leadId).maybeSingle();
  if (leadFetchError || !lead) return { error: leadFetchError?.message || "Lead not found." };

  const { data: journey } = await supabase.from("crm_journeys").select("*").eq("id", lead.journey_id).maybeSingle();
  const stage = (journey?.stages as CrmJourneyStage[] | undefined)?.find((s) => s.key === stageKey);

  const { error: stageError } = await supabase.from("crm_stage_events").insert([
    { journey_id: lead.journey_id, lead_id: leadId, stage_key: stageKey, note: note || null },
  ]);
  if (stageError) return { error: stageError.message };

  const { error: updateError } = await supabase
    .from("crm_leads")
    .update({ current_stage_key: stageKey, status: stage?.is_won ? "won" : stage?.is_lost ? "lost" : "open" })
    .eq("id", leadId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/crm/journeys");

  // If moving to a non-won stage, demote: remove the auto-converted client record if it has no associated invoices
  if (!stage?.is_won && lead.converted_to_client_id) {
    const clientIdToRemove = lead.converted_to_client_id;
    
    // Check if client has any active billing invoices before deleting
    const { count: invoiceCount } = await supabase
      .from("crm_invoices")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientIdToRemove);

    if (!invoiceCount || invoiceCount === 0) {
      // First disconnect foreign key reference on lead to prevent 409 FK violation
      await supabase.from("crm_leads").update({ converted_to_client_id: null }).eq("id", leadId);
      await supabase.from("crm_clients").delete().eq("id", clientIdToRemove);
      revalidatePath("/crm/clients");
    }
  }

  // If moving into a won stage and not yet converted, promote to client
  if (stage?.is_won && !lead.converted_to_client_id) {
    const result = await promoteLeadToClient(supabase, lead);
    if ("error" in result) return result;
    revalidatePath("/crm/clients");
    return { success: true, clientId: result.clientId };
  }

  return { success: true };
}

export async function convertLeadToClient(leadId: string): Promise<ActionResult & { clientId?: string }> {
  await requireCrmUser({ page: "leads", action: "leads_edit" });
  const supabase = createAdminClient();
  const { data: lead, error } = await supabase.from("crm_leads").select("*").eq("id", leadId).maybeSingle();
  if (error || !lead) return { error: error?.message || "Lead not found." };
  if (lead.converted_to_client_id) return { success: true, clientId: lead.converted_to_client_id };

  const result = await promoteLeadToClient(supabase, lead);
  if ("error" in result) return result;

  await supabase.from("crm_stage_events").insert([
    { journey_id: lead.journey_id, lead_id: leadId, stage_key: "won", note: "Manually converted to client" },
  ]);

  revalidatePath("/crm/leads");
  revalidatePath("/crm/clients");
  return { success: true, clientId: result.clientId };
}
