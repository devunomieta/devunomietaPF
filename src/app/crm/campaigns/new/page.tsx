import { createClient } from "@/utils/supabase/server";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { NewCampaignForm } from "./NewCampaignForm";

export const metadata = { title: "New campaign · CRM" };

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; leadId?: string }>;
}) {
  const { clientId, leadId } = await searchParams;
  const supabase = await createClient();

  const [{ data: journey }, recipientResult] = await Promise.all([
    supabase.from("crm_journeys").select("stages").eq("is_default", true).maybeSingle(),
    clientId
      ? supabase.from("crm_clients").select("id, name, email").eq("id", clientId).maybeSingle()
      : leadId
        ? supabase.from("crm_leads").select("id, name, email").eq("id", leadId).maybeSingle()
        : Promise.resolve({ data: null }),
  ]);

  const stages = ((journey?.stages as CrmJourneyStage[] | undefined) || []).sort((a, b) => a.position - b.position);

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">New campaign</h1>
        <p className="text-sm text-muted">Send to one person, or a filtered audience.</p>
      </div>
      <NewCampaignForm
        stages={stages}
        prefillRecipient={recipientResult.data ? { ...recipientResult.data, clientId: clientId || null, leadId: leadId || null } : null}
      />
    </div>
  );
}
