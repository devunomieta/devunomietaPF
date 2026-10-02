import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { AlertTriangle, Copy, RotateCcw, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { isWhatsAppConfigured, getWhatsAppInstanceState } from "@/lib/crm/whatsapp";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { WhatsAppForm } from "./WhatsAppForm";
import { WhatsAppDeviceModal } from "./WhatsAppDeviceModal";
import { WhatsAppMessageCell } from "./WhatsAppMessageCell";
import { CrmPageGuide } from "@/components/crm/CrmPageGuide";

export const metadata = { title: "WhatsApp · CRM" };
export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ clientId?: string; leadId?: string; resendEventId?: string; duplicateMessage?: string }>;
}) {
  const { clientId, leadId, resendEventId, duplicateMessage } = await searchParams;
  const supabase = await createClient();

  const [
    { data: journey },
    { data: events },
    recipientResult,
    { data: leadRows },
    { data: clientRows },
    { data: sourceEvent },
    instanceStatusResult,
  ] = await Promise.all([
    supabase.from("crm_journeys").select("stages").eq("is_default", true).maybeSingle(),
    supabase
      .from("crm_whatsapp_events")
      .select("id, phone, message, status, direction, occurred_at, client_id, lead_id")
      .order("occurred_at", { ascending: false })
      .limit(5),
    clientId
      ? supabase.from("crm_clients").select("id, name, phone").eq("id", clientId).maybeSingle()
      : leadId
        ? supabase.from("crm_leads").select("id, name, phone").eq("id", leadId).maybeSingle()
        : Promise.resolve({ data: null }),
    supabase.from("crm_leads").select("tags, created_at").not("tags", "is", null).order("created_at", { ascending: false }).limit(1000),
    supabase.from("crm_clients").select("tags, created_at").not("tags", "is", null).order("created_at", { ascending: false }).limit(1000),
    resendEventId
      ? supabase.from("crm_whatsapp_events").select("*").eq("id", resendEventId).maybeSingle()
      : Promise.resolve({ data: null }),
    getWhatsAppInstanceState(),
  ]);

  const stages = ((journey?.stages as CrmJourneyStage[] | undefined) || []).sort((a, b) => a.position - b.position);
  const configured = isWhatsAppConfigured();
  const instanceState = instanceStatusResult.state;
  const isAuthorized = instanceState === "authorized" || instanceState === "connected";

  // Last 5 activities only
  const pagedEvents = ((events as EventRow[]) || []).slice(0, 5);

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
    {
      header: "Phone",
      className: "w-36 shrink-0",
      cell: (e) => <span className="font-mono text-xs font-semibold text-foreground/90 whitespace-nowrap">{e.phone}</span>,
    },
    {
      header: "Direction",
      className: "w-24 shrink-0",
      cell: (e) => <span className="text-muted capitalize text-xs">{e.direction}</span>,
    },
    {
      header: "Message",
      className: "min-w-[200px] max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg",
      mobileStacked: true,
      cell: (e) => <WhatsAppMessageCell message={e.message} />,
    },
    {
      header: "Status",
      className: "w-24 shrink-0 text-center",
      cell: (e) => (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium inline-block capitalize ${STATUS_STYLES[e.status] || ""}`}>
          {e.status}
        </span>
      ),
    },
    {
      header: "When",
      className: "w-40 shrink-0 text-xs text-muted whitespace-nowrap",
      cell: (e) => new Date(e.occurred_at).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      }),
    },
    {
      header: "",
      className: "w-36 shrink-0 text-right",
      cell: (e) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          {e.direction === "outbound" && (
            <>
              <Link
                href={`/crm/whatsapp?resendEventId=${e.id}`}
                title="Resend to this number"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-header/60 hover:bg-header text-foreground border border-border/80 transition-colors shadow-xs"
              >
                <RotateCcw size={11} className="text-accent-blue" />
                Resend
              </Link>
              <Link
                href={`/crm/whatsapp?duplicateMessage=${encodeURIComponent(e.message || "")}`}
                title="Duplicate & Edit message"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-header/60 hover:bg-header text-muted hover:text-foreground border border-border/80 transition-colors shadow-xs"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">WhatsApp</h1>
          <p className="text-sm text-muted">
            {instanceStatusResult.provider === "baileys"
              ? "Fast, direct WhatsApp messaging via Baileys multi-device."
              : "Single sends and small batches via WhatsApp."}
          </p>
        </div>

        {/* Live WhatsApp Multi-Device Connection & QR Modal */}
        <WhatsAppDeviceModal
          initialState={instanceState}
          connectedPhone={instanceStatusResult.phone}
          provider={instanceStatusResult.provider}
        />
      </div>

      <CrmPageGuide
        pageKey="whatsapp"
        title="WhatsApp Messaging & Broadcasts"
        description="Communicate with leads and clients directly on WhatsApp. You can send individual personalized messages or dispatch smart randomized batches with spintax support to prevent spam filtering."
        tips={[
          "Ensure recipient phone numbers include their international country code (e.g. +234 for Nigeria).",
          "Use Spintax like {Hi|Hello|Good day} to generate varied phrasing for bulk messages.",
          "Check the Recent Activity log below to monitor outbound message delivery states.",
        ]}
      />

      {!configured ? (
        <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            WhatsApp isn&apos;t configured yet — set <code>BAILEYS_BRIDGE_URL</code> and{" "}
            <code>BAILEYS_BRIDGE_SECRET</code> in Vercel environment variables.
          </span>
        </div>
      ) : !isAuthorized ? (
        <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <strong>WhatsApp device is not linked.</strong> Click <strong>&quot;Link Device&quot;</strong> above to scan the live QR code with your smartphone.
          </span>
        </div>
      ) : null}

      <WhatsAppForm
        stages={stages}
        availableTags={availableTags}
        disabled={!configured || !isAuthorized}
        prefillRecipient={effectiveRecipient}
        prefillMessage={prefillMessage}
        initialMode={sourceEvent && !sourceEvent.phone ? "bulk" : undefined}
      />

      <div className="bg-header/20 border border-border rounded-xl p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pt-2 mb-2">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Recent activity</h2>
          <span className="text-xs text-muted">Showing last 5 activities</span>
        </div>
        <ResponsiveTable columns={columns} rows={pagedEvents} emptyLabel="No WhatsApp activity yet." />
      </div>
    </div>
  );
}

