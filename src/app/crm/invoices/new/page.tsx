import { createClient } from "@/utils/supabase/server";
import { NewInvoiceForm } from "./NewInvoiceForm";

export const metadata = { title: "New invoice · CRM" };
export const maxDuration = 30;

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const supabase = await createClient();

  const [{ data: clients }, { data: settings }] = await Promise.all([
    supabase.from("crm_clients").select("id, name, company").order("name"),
    supabase.from("crm_settings").select("default_currency, default_tax_rate").eq("id", "default").maybeSingle(),
  ]);

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">New invoice</h1>
        <p className="text-sm text-muted">Numbers are assigned automatically and tracked in sequence.</p>
      </div>
      <NewInvoiceForm
        clients={clients || []}
        defaultClientId={clientId}
        defaultCurrency={settings?.default_currency || "NGN"}
        defaultTaxRate={settings?.default_tax_rate || 0}
      />
    </div>
  );
}
