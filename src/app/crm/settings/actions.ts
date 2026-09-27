"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";
import { getGreenApiInstanceState } from "@/lib/crm/green-api";
import type { ActionResult } from "@/lib/crm/types";

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAdmin();

  let logoUrl = (formData.get("existingLogoUrl") as string) || null;
  const logoFile = formData.get("logo") as File | null;
  if (logoFile && logoFile.size > 0) {
    const adminDb = createAdminClient();
    const path = `logo-${Date.now()}-${logoFile.name}`;
    const { error: uploadError } = await adminDb.storage.from("crm-logos").upload(path, logoFile, {
      contentType: logoFile.type || "image/png",
      upsert: true,
    });
    if (uploadError) return { error: `Logo upload failed: ${uploadError.message}` };
    const { data: publicUrl } = adminDb.storage.from("crm-logos").getPublicUrl(path);
    logoUrl = publicUrl.publicUrl;
  }

  const { error } = await supabase
    .from("crm_settings")
    .update({
      business_name: (formData.get("business_name") as string)?.trim() || null,
      business_email: (formData.get("business_email") as string)?.trim() || null,
      business_phone: (formData.get("business_phone") as string)?.trim() || null,
      business_address: (formData.get("business_address") as string)?.trim() || null,
      logo_url: logoUrl,
      brand_color: (formData.get("brand_color") as string) || "#58a6ff",
      invoice_prefix: (formData.get("invoice_prefix") as string)?.trim() || "INV",
      invoice_footer_note: (formData.get("invoice_footer_note") as string)?.trim() || null,
      default_currency: (formData.get("default_currency") as string)?.trim() || "USD",
      default_tax_rate: parseFloat(formData.get("default_tax_rate") as string) || 0,
      brevo_daily_cap: parseInt(formData.get("brevo_daily_cap") as string) || 300,
      bounce_alert_threshold: parseFloat(formData.get("bounce_alert_threshold") as string) || 5,
      complaint_alert_threshold: parseFloat(formData.get("complaint_alert_threshold") as string) || 0.1,
    })
    .eq("id", "default");

  if (error) return { error: error.message };

  revalidatePath("/crm/settings");
  return { success: true };
}

export async function checkWhatsAppConnection() {
  await requireAdmin();
  return getGreenApiInstanceState();
}
