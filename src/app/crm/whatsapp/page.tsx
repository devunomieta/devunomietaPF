import { createClient } from "@/utils/supabase/server";
import { AlertTriangle } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { isGreenApiConfigured } from "@/lib/crm/green-api";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { WhatsAppForm } from "./WhatsAppForm";

export const metadata = { title: "WhatsApp · CRM" };

type EventRow = { id: string; phone: string; message: string | null; status: string; direction: string; occurred_at: string };

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-muted/20 text-muted",
  sent: "bg-accent-blue/15 text-accent-blue",
  delivered: "bg-accent-green/15 text-accent-green",
  read: "bg-accent-green/15 text-accent-green",
  failed: "bg-red-400/15 text-red-400",
};

export default async function CrmWhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; leadId?: string }>;
}) {
  const { clientId, leadId } = await searchParams;
  const supabase = await createClient();

  const [{ data: journey }, { data: events }, recipientResult] = await Promise.all([
    supabase.from("crm_journeys").select("stages").eq("is_default", true).maybeSingle(),
    supabase.from("crm_whatsapp_events").select("id, phone, message, status, direction, occurred_at").order("occurred_at", { ascending: false }).limit(50),
    clientId
      ? supabase.from("crm_clients").select("id, name, phone").eq("id", clientId).maybeSingle()
      : leadId
        ? supabase.from("crm_leads").select("id, name, phone").eq("id", leadId).maybeSingle()
        : Promise.resolve({ data: null }),
  ]);

  const stages = ((journey?.stages as CrmJourneyStage[] | undefined) || []).sort((a, b) => a.position - b.position);
  const configured = isGreenApiConfigured();

  const columns: CrmColumn<EventRow>[] = [
    { header: "Phone", cell: (e) => e.phone },
    { header: "Direction", cell: (e) => <span className="text-muted capitalize">{e.direction}</span> },
    { header: "Message", cell: (e) => <span className="truncate block max-w-xs">{e.message || "—"}</span> },
    { header: "Status", cell: (e) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[e.status] || ""}`}>{e.status}</span> },
    { header: "When", cell: (e) => new Date(e.occurred_at).toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">WhatsApp</h1>
        <p className="text-sm text-muted">Single sends and small batches via GREEN-API.</p>
      </div>

      {!configured && (
        <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            WhatsApp isn&apos;t configured yet — set <code>GREEN_API_ID_INSTANCE</code> and{" "}
            <code>GREEN_API_API_TOKEN_INSTANCE</code>. See <code>docs/CRM_SETUP.md</code> for the full setup guide.
          </span>
        </div>
      )}

      <WhatsAppForm
        stages={stages}
        disabled={!configured}
        prefillRecipient={recipientResult.data ? { ...recipientResult.data, clientId: clientId || null, leadId: leadId || null } : null}
      />

      <div className="bg-header/20 border border-border rounded-xl p-2 sm:p-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider px-2 pt-2 mb-2">Recent activity</h2>
        <ResponsiveTable columns={columns} rows={(events as EventRow[]) || []} emptyLabel="No WhatsApp activity yet." />
      </div>
    </div>
  );
}
