"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import type { CrmLead, CrmJourneyStage } from "@/lib/crm/types";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { moveLeadStage } from "../leads/actions";

export function JourneyBoard({ stages, leads }: { stages: CrmJourneyStage[]; leads: CrmLead[] }) {
  const router = useRouter();
  const { toast } = useCrmFeedback();
  const [movingId, setMovingId] = useState<string | null>(null);

  const openStages = stages.filter((s) => !s.is_won && !s.is_lost);
  const terminalStages = stages.filter((s) => s.is_won || s.is_lost);
  const columns = [...openStages, ...terminalStages];

  function nextStage(current: string): CrmJourneyStage | null {
    const idx = openStages.findIndex((s) => s.key === current);
    if (idx === -1 || idx === openStages.length - 1) return null;
    return openStages[idx + 1];
  }

  async function handleAdvance(leadId: string, stageKey: string) {
    setMovingId(leadId);
    const result = await moveLeadStage(leadId, stageKey);
    setMovingId(null);
    if ("success" in result) {
      if (result.clientId) router.push(`/crm/clients/${result.clientId}`);
      else router.refresh();
    } else {
      toast(result.error);
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-0 sm:px-0 snap-x snap-mandatory">
      {columns.map((stage) => {
        const stageLeads = leads.filter((l) => l.current_stage_key === stage.key);
        return (
          <div
            key={stage.key}
            className="shrink-0 w-64 snap-start bg-header/20 border border-border rounded-xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-foreground">{stage.label}</h2>
              <span className="text-xs text-muted">{stageLeads.length}</span>
            </div>
            <div className="flex flex-col gap-2 min-h-[2rem]">
              {stageLeads.map((lead) => {
                const next = nextStage(lead.current_stage_key);
                return (
                  <div key={lead.id} className="bg-background border border-border rounded-lg p-2.5 flex items-start justify-between gap-2">
                    <a href={`/crm/leads/${lead.id}`} className="text-sm text-foreground hover:text-accent-blue min-w-0">
                      <p className="truncate font-medium">{lead.name}</p>
                      {lead.company && <p className="text-xs text-muted truncate">{lead.company}</p>}
                    </a>
                    {!stage.is_won && !stage.is_lost && next && (
                      <button
                        onClick={() => handleAdvance(lead.id, next.key)}
                        disabled={movingId === lead.id}
                        aria-label={`Advance to ${next.label}`}
                        className="text-muted hover:text-accent-blue shrink-0 mt-0.5"
                      >
                        {movingId === lead.id ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={16} />}
                      </button>
                    )}
                  </div>
                );
              })}
              {stageLeads.length === 0 && <p className="text-xs text-muted px-1 py-2">No leads here.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
