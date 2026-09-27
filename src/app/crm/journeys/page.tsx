import { createClient } from "@/utils/supabase/server";
import { JourneyBoard } from "./JourneyBoard";
import type { CrmLead, CrmJourneyStage } from "@/lib/crm/types";

export const metadata = { title: "Journeys · CRM" };

export default async function CrmJourneysPage() {
  const supabase = await createClient();

  const { data: journey } = await supabase.from("crm_journeys").select("*").eq("is_default", true).maybeSingle();
  const { data: leads } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("journey_id", journey?.id || "")
    .order("created_at", { ascending: false });

  const stages = ((journey?.stages as CrmJourneyStage[] | undefined) || []).sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{journey?.name || "Pipeline"}</h1>
        <p className="text-sm text-muted">Leads move left to right — tap a card to open it, or use the arrow to advance a stage.</p>
      </div>
      <JourneyBoard stages={stages} leads={(leads as CrmLead[]) || []} />
    </div>
  );
}
