import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ArrowLeft } from "lucide-react";
import type { CrmLead, CrmContact, CrmStageEvent, CrmJourneyStage, CrmThread, CrmInternalNote, CrmCommunicationTemplate } from "@/lib/crm/types";
import { LeadDetailClient } from "./LeadDetailClient";
import { getEntityCommunicationFeed, getCommunicationTemplates } from "@/app/crm/mailbox/actions";

export const metadata = { title: "Lead · CRM" };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("crm_leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const [
    { data: contacts },
    { data: stageEvents },
    { data: journey },
    { data: whatsappEvents },
    feed,
    templates,
  ] = await Promise.all([
    supabase.from("crm_contacts").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("crm_stage_events").select("*").eq("lead_id", id).order("entered_at", { ascending: false }),
    lead.journey_id
      ? supabase.from("crm_journeys").select("*").eq("id", lead.journey_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("crm_whatsapp_events").select("id, phone, message, status, direction, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
    getEntityCommunicationFeed({ leadId: id }),
    getCommunicationTemplates(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/crm/leads" className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} />
        Leads
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{lead.name}</h1>
          <p className="text-sm text-muted">{lead.company || "No company"}</p>
        </div>
      </div>

      <LeadDetailClient
        lead={lead as CrmLead}
        contacts={(contacts as CrmContact[]) || []}
        stageEvents={(stageEvents as CrmStageEvent[]) || []}
        stages={(journey?.stages as CrmJourneyStage[] | undefined) || []}
        threads={(feed?.threads as CrmThread[]) || []}
        internalNotes={(feed?.internalNotes as CrmInternalNote[]) || []}
        templates={(templates as CrmCommunicationTemplate[]) || []}
        whatsAppEvents={(whatsappEvents as any[]) || []}
      />
    </div>
  );
}
