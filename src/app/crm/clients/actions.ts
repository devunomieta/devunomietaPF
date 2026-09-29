"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import type { ActionResult } from "@/lib/crm/types";

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function saveClient(formData: FormData, id?: string): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required." };

  const clientData = {
    name,
    email: (formData.get("email") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    company: (formData.get("company") as string)?.trim() || null,
    location: (formData.get("location") as string)?.trim() || null,
    website: (formData.get("website") as string)?.trim() || null,
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
  const supabase = await requireAdmin();
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
  return { success: true };
}

export async function addContact(
  formData: FormData,
  owner: { clientId?: string; leadId?: string }
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required." };

  const { error } = await supabase.from("crm_contacts").insert([
    {
      client_id: owner.clientId || null,
      lead_id: owner.leadId || null,
      name,
      role: (formData.get("role") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim() || null,
      phone: (formData.get("phone") as string)?.trim() || null,
    },
  ]);

  if (error) return { error: error.message };

  if (owner.clientId) revalidatePath(`/crm/clients/${owner.clientId}`);
  if (owner.leadId) revalidatePath(`/crm/leads/${owner.leadId}`);
  return { success: true };
}

export async function deleteContact(id: string, owner: { clientId?: string; leadId?: string }): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
  if (error) return { error: error.message };
  if (owner.clientId) revalidatePath(`/crm/clients/${owner.clientId}`);
  if (owner.leadId) revalidatePath(`/crm/leads/${owner.leadId}`);
  return { success: true };
}
