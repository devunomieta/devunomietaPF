import { createClient } from "@/utils/supabase/server";
import { ClientsManager } from "./ClientsManager";
import type { CrmClient } from "@/lib/crm/types";

export const metadata = { title: "Clients · CRM" };

export default async function CrmClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("crm_clients")
    .select("*")
    .order("created_at", { ascending: false });

  return <ClientsManager initialClients={(clients as CrmClient[]) || []} />;
}
