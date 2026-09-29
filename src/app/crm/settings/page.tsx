import { createClient } from "@/utils/supabase/server";
import { isGreenApiConfigured } from "@/lib/crm/green-api";
import type { CrmSettings } from "@/lib/crm/types";
import { SettingsForm } from "./SettingsForm";
import { CrmPageGuide } from "@/components/crm/CrmPageGuide";

export const metadata = { title: "Settings · CRM" };

export default async function CrmSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle();

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted">Invoice branding, sending limits, and integration status.</p>
      </div>

      <CrmPageGuide
        pageKey="settings"
        title="CRM Configuration & Integrations"
        description="Configure your business identity for generated invoices, set default currencies and tax rates, and review the connectivity status of external messaging gateways."
        tips={[
          "Your business logo and invoice notes will dynamically appear on all generated client invoices.",
          "Verify that GreenAPI instance credentials are set to enable direct WhatsApp messaging.",
          "Brevo email dispatch is governed by the daily sending cap configured here.",
        ]}
      />

      <SettingsForm settings={settings as CrmSettings} whatsappConfigured={isGreenApiConfigured()} />
    </div>
  );
}
