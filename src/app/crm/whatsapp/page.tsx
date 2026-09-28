import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AlertTriangle, Copy, RotateCcw } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { CrmUrlPagination } from "@/components/crm/CrmUrlPagination";
import { isGreenApiConfigured } from "@/lib/crm/green-api";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { WhatsAppForm } from "./WhatsAppForm";

export const metadata = { title: "WhatsApp · CRM" };

type EventRow = {
  id: string;
  phone: string;
  message: string | null;
  status: string;
  direction: string;
  occurred_at: string;
  client_id?: string | null;
  lead_id?: string | null;
};

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
  searchParams: Promise<{ clientId?: string; leadId?: string; resendEventId?: string; duplicateMessage?: string; page?: string }>;
}) {
  const { clientId, leadId, resendEventId, duplicateMessage, page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 20;
  const supabase = await createClient();

  const [{ data: journey }, { data: events }, recipientResult, { data: leadRows }, { data: clientRows }, { data: sourceEvent }] = await Promise.all([
    supabase.from("crm_journeys").select("stages").eq("is_default", true).maybeSingle(),
    supabase.from("crm_whatsapp_events").select("id, phone, message, status, direction, occurred_at, client_id, lead_id").order("occurred_at", { ascending: false }).limit(500),
    clientId
      ? supabase.from("crm_clients").select("id, name, phone").eq("id", clientId).maybeSingle()
      : leadId
        ? supabase.from("crm_leads").select("id, name, phone").eq("id", leadId).maybeSingle()
        : Promise.resolve({ data: null }),
    supabase.from("crm_leads").select("tags, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("crm_clients").select("tags, created_at").order("created_at", { ascending: false }).limit(200),
    resendEventId
      ? supabase.from("crm_whatsapp_events").select("*").eq("id", resendEventId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const stages = ((journey?.stages as CrmJourneyStage[] | undefined) || []).sort((a, b) => a.position - b.position);
  const configured = isGreenApiConfigured();

  const allEvents = (events as EventRow[]) || [];
  const start = (currentPage - 1) * pageSize;
  const pagedEvents = allEvents.slice(start, start + pageSize);

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

  // Resolve prefill data from explicit recipient or from resend source event
  const effectiveRecipient = recipientResult?.data
    ? { ...recipientResult.data, clientId: clientId || null, leadId: leadId || null }
    : sourceEvent
      ? {
          id: sourceEvent.client_id || sourceEvent.lead_id || "",
          name: "",
          phone: sourceEvent.phone,
          clientId: sourceEvent.client_id || null,
          leadId: sourceEvent.lead_id || null,
        }
      : null;

  const prefillMessage = sourceEvent?.message || duplicateMessage || null;

  const columns: CrmColumn<EventRow>[] = [
    { header: "Phone", cell: (e) => <span className="font-mono text-xs">{e.phone}</span> },
    { header: "Direction", cell: (e) => <span className="text-muted capitalize">{e.direction}</span> },
    { header: "Message", cell: (e) => <span className="truncate block max-w-md lg:max-w-xl text-foreground/90">{e.message || "—"}</span> },
    { header: "Status", cell: (e) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[e.status] || ""}`}>{e.status}</span> },
    { header: "When", cell: (e) => new Date(e.occurred_at).toLocaleString() },
    {
      header: "",
      cell: (e) => (
        <div className="flex items-center justify-end gap-1.5">
          {e.direction === "outbound" && (
            <>
              <Link
                href={`/crm/whatsapp?resendEventId=${e.id}`}
                title="Resend to this number"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-header/40 hover:bg-header/80 text-foreground border border-border/60 transition-colors"
              >
                <RotateCcw size={11} className="text-accent-blue" />
                Resend
              </Link>
              <Link
                href={`/crm/whatsapp?duplicateMessage=${encodeURIComponent(e.message || "")}`}
                title="Duplicate & Edit message"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-header/40 hover:bg-header/80 text-muted hover:text-foreground border border-border/60 transition-colors"
              >
                <Copy size={11} />
                Duplicate
              </Link>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 w-full">
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
        availableTags={availableTags}
        disabled={!configured}
        prefillRecipient={effectiveRecipient}
        prefillMessage={prefillMessage}
        initialMode={sourceEvent && !sourceEvent.phone ? "bulk" : undefined}
      />

      <div className="bg-header/20 border border-border rounded-xl p-2 sm:p-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider px-2 pt-2 mb-2">Recent activity</h2>
        <ResponsiveTable columns={columns} rows={pagedEvents} emptyLabel="No WhatsApp activity yet." />
        <CrmUrlPagination totalItems={allEvents.length} pageSize={pageSize} />
      </div>
    </div>
  );
}

