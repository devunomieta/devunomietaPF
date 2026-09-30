"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireCrmUser } from "@/lib/crm/auth";
import type { ActionResult } from "@/lib/crm/types";

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseEmails(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function saveClient(formData: FormData, id?: string): Promise<ActionResult> {
  await requireCrmUser({ page: "clients", action: "clients_edit" });
  const supabase = createAdminClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required." };

  const email = (formData.get("email") as string)?.trim() || null;
  const website = (formData.get("website") as string)?.trim() || null;
  const additionalEmails = parseEmails(formData.get("additional_emails"));

  // Extract domain fallback
  let companyDomain: string | null = null;
  if (website) {
    try {
      const url = website.startsWith("http") ? website : `https://${website}`;
      companyDomain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      companyDomain = website.replace(/^www\./, "").split("/")[0] || null;
    }
  } else if (email && email.includes("@")) {
    companyDomain = email.split("@")[1] || null;
  }

  const clientData = {
    name,
    email,
    additional_emails: additionalEmails,
    company_domain: companyDomain,
    phone: (formData.get("phone") as string)?.trim() || null,
    company: (formData.get("company") as string)?.trim() || null,
    location: (formData.get("location") as string)?.trim() || null,
    website,
    pain_points: (formData.get("pain_points") as string)?.trim() || null,
    proposed_solution: (formData.get("proposed_solution") as string)?.trim() || null,
    status: (formData.get("status") as string) || "active",
    tags: parseTags(formData.get("tags")),
    notes: (formData.get("notes") as string)?.trim() || null,
    co_handled_by: (formData.get("co_handled_by") as string)?.trim() || null,
  };

  let error;
  if (id) {
    ({ error } = await supabase.from("crm_clients").update(clientData).eq("id", id));
  } else {
    ({ error } = await supabase
      .from("crm_clients")
      .insert([{ ...clientData, source: "manual" }]));
  }

  if (error) return { error: error.message };

  revalidatePath("/crm/clients");
  return { success: true };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  await requireCrmUser({ page: "clients", action: "clients_delete" });
  const supabase = createAdminClient();

  // If this client was converted from a lead, restore the lead back to open leads
  const { data: linkedLeads } = await supabase
    .from("crm_leads")
    .select("id, journey_id")
    .eq("converted_to_client_id", id);

  if (linkedLeads && linkedLeads.length > 0) {
    for (const lead of linkedLeads) {
      // Find initial stage for journey if possible
      let initialStageKey = "lead";
      if (lead.journey_id) {
        const { data: journey } = await supabase.from("crm_journeys").select("stages").eq("id", lead.journey_id).maybeSingle();
        const firstStage = (journey?.stages as any[])?.sort((a, b) => a.position - b.position)[0];
        if (firstStage?.key) initialStageKey = firstStage.key;
      }
      await supabase
        .from("crm_leads")
        .update({
          converted_to_client_id: null,
          status: "open",
          current_stage_key: initialStageKey,
        })
        .eq("id", lead.id);

      await supabase.from("crm_stage_events").insert([
        {
          journey_id: lead.journey_id,
          lead_id: lead.id,
          stage_key: initialStageKey,
          note: "Demoted: client record deleted, returned to leads",
        },
      ]);
      revalidatePath(`/crm/leads/${lead.id}`);
    }
  }

  const { error } = await supabase.from("crm_clients").delete().eq("id", id);
  if (error) {
    if (error.code === "23503" || error.message?.includes("crm_invoices_client_id_fkey")) {
      return {
        error: "Cannot delete this client because they have existing invoices or financial records attached. Please delete or reassign their invoices first, or enable cascade deletion in database settings.",
      };
    }
    if (error.code === "23503") {
      return {
        error: "Cannot delete this client because other records (such as emails or inquiries) are linked to them.",
      };
    }
    return { error: error.message };
  }
  revalidatePath("/crm/clients");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/journeys");
  return { success: true };
}

export async function addContact(
  formData: FormData,
  owner: { clientId?: string; leadId?: string }
): Promise<ActionResult> {
  if (owner.clientId) {
    await requireCrmUser({ page: "clients", action: "clients_edit" });
  } else if (owner.leadId) {
    await requireCrmUser({ page: "leads", action: "leads_edit" });
  } else {
    await requireCrmUser();
  }
  const supabase = createAdminClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required." };

  const email = (formData.get("email") as string)?.trim() || null;
  const additionalEmails = parseEmails(formData.get("additional_emails"));

  const { error } = await supabase.from("crm_contacts").insert([
    {
      client_id: owner.clientId || null,
      lead_id: owner.leadId || null,
      name,
      role: (formData.get("role") as string)?.trim() || null,
      email,
      additional_emails: additionalEmails,
      phone: (formData.get("phone") as string)?.trim() || null,
    },
  ]);

  if (error) return { error: error.message };

  if (owner.clientId) revalidatePath(`/crm/clients/${owner.clientId}`);
  if (owner.leadId) revalidatePath(`/crm/leads/${owner.leadId}`);
  return { success: true };
}

export async function deleteContact(id: string, owner: { clientId?: string; leadId?: string }): Promise<ActionResult> {
  if (owner.clientId) {
    await requireCrmUser({ page: "clients", action: "clients_edit" });
  } else if (owner.leadId) {
    await requireCrmUser({ page: "leads", action: "leads_edit" });
  } else {
    await requireCrmUser();
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
  if (error) return { error: error.message };
  if (owner.clientId) revalidatePath(`/crm/clients/${owner.clientId}`);
  if (owner.leadId) revalidatePath(`/crm/leads/${owner.leadId}`);
  return { success: true };
}
