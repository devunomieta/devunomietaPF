import { createClient } from "@/utils/supabase/server";
import { LeadsManager } from "./LeadsManager";
import type { CrmLead } from "@/lib/crm/types";

export const metadata = { title: "Leads · CRM" };

export default async function CrmLeadsPage() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("crm_leads")
    .select("*")
    .is("converted_to_client_id", null)
    .order("created_at", { ascending: false });

  return <LeadsManager initialLeads={(leads as CrmLead[]) || []} />;
}
