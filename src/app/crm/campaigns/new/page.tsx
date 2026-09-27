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

  const [{ data: journey }, recipientResult, { data: leadRows }, { data: clientRows }] = await Promise.all([
    supabase.from("crm_journeys").select("stages").eq("is_default", true).maybeSingle(),
    clientId
      ? supabase.from("crm_clients").select("id, name, email").eq("id", clientId).maybeSingle()
      : leadId
        ? supabase.from("crm_leads").select("id, name, email").eq("id", leadId).maybeSingle()
        : Promise.resolve({ data: null }),
    supabase.from("crm_leads").select("tags, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("crm_clients").select("tags, created_at").order("created_at", { ascending: false }).limit(200),
  ]);

  const stages = ((journey?.stages as CrmJourneyStage[] | undefined) || []).sort((a, b) => a.position - b.position);

  // Preserve recency of tag usage across records
  const recentTagsList: string[] = [];
  const seenTags = new Set<string>();

  const combinedRows = [...(leadRows || []), ...(clientRows || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const row of combinedRows) {
    for (const tag of row.tags || []) {
      const clean = tag?.trim();
      if (clean && !seenTags.has(clean)) {
        seenTags.add(clean);
        recentTagsList.push(clean);
      }
    }
  }

  const availableTags = recentTagsList;

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">New campaign</h1>
        <p className="text-sm text-muted">Send to one person, or a filtered audience.</p>
      </div>
      <NewCampaignForm
        stages={stages}
        availableTags={availableTags}
        prefillRecipient={recipientResult.data ? { ...recipientResult.data, clientId: clientId || null, leadId: leadId || null } : null}
      />
    </div>
  );
}
