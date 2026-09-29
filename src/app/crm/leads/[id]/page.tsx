import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import type { CrmLead, CrmContact, CrmStageEvent, CrmJourneyStage } from "@/lib/crm/types";
import { LeadDetailClient } from "./LeadDetailClient";

export const metadata = { title: "Lead · CRM" };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("crm_leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const [{ data: contacts }, { data: stageEvents }, { data: journey }] = await Promise.all([
    supabase.from("crm_contacts").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("crm_stage_events").select("*").eq("lead_id", id).order("entered_at", { ascending: false }),
    lead.journey_id
      ? supabase.from("crm_journeys").select("*").eq("id", lead.journey_id).maybeSingle()
      : Promise.resolve({ data: null }),
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/crm/campaigns/new?leadId=${lead.id}`}
            className="px-3 py-2 border border-border rounded-lg hover:bg-header/50 transition-all text-sm inline-flex items-center gap-1.5"
            id="btn-lead-direct-email"
          >
            <Mail size={14} /> Email
          </Link>
          <Link
            href={`/crm/whatsapp?leadId=${lead.id}`}
            className="px-3 py-2 border border-border rounded-lg hover:bg-header/50 transition-all text-sm inline-flex items-center gap-1.5"
            id="btn-lead-direct-whatsapp"
          >
            <MessageCircle size={14} /> WhatsApp
          </Link>
        </div>
      </div>

      <LeadDetailClient
        lead={lead as CrmLead}
        contacts={(contacts as CrmContact[]) || []}
        stageEvents={(stageEvents as CrmStageEvent[]) || []}
        stages={(journey?.stages as CrmJourneyStage[] | undefined) || []}
      />
    </div>
  );
}
