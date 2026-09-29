import { createClient } from "@/utils/supabase/server";
import { JourneyBoard } from "./JourneyBoard";
import type { CrmLead, CrmJourneyStage } from "@/lib/crm/types";
import { CrmPageGuide } from "@/components/crm/CrmPageGuide";

export const metadata = { title: "Journeys · CRM" };

export default async function CrmJourneysPage() {
  const supabase = await createClient();

  // Fetch the default journey, or first journey if none marked default
  let { data: journey } = await supabase.from("crm_journeys").select("*").eq("is_default", true).maybeSingle();
  if (!journey) {
    const { data: firstJourney } = await supabase.from("crm_journeys").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
    journey = firstJourney;
  }

  // Fetch all leads for this journey, or fallback to leads without journey if none set
  let query = supabase.from("crm_leads").select("*").order("created_at", { ascending: false });
  if (journey?.id) {
    query = query.or(`journey_id.eq.${journey.id},journey_id.is.null`);
  }
  const { data: leads } = await query;

  const stages = ((journey?.stages as CrmJourneyStage[] | undefined) || []).sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-4">
      <CrmPageGuide
        pageKey="journeys"
        title="Interactive Deal Journey Board (Kanban)"
        description="Visualize and drag leads between journey stages. This visual pipeline helps your team track where prospective deals stand from initial outreach to deal closing."
        tips={[
          "Drag and drop cards across columns to advance leads to subsequent stages.",
          "Stages marked 'Won' will prompt conversion of the lead into a billing client.",
          "Filter by tags or search directly within the board to isolate priority prospects.",
        ]}
      />
      <div className="h-[calc(100vh-10rem)]">
        <JourneyBoard
          pipelineName={journey?.name || "Conversion Stages"}
          stages={stages}
          leads={(leads as CrmLead[]) || []}
        />
      </div>
    </div>
  );
}
