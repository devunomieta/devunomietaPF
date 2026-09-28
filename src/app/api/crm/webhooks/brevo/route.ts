import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

// Configure this URL (with ?secret=...) as a webhook in Brevo → Transactional → Settings → Webhooks,
// for the events: delivered, hard_bounce, soft_bounce, spam, unsubscribed, opened, click, error, blocked.
const EVENT_MAP: Record<string, string> = {
  delivered: "delivered",
  hard_bounce: "hard_bounce",
  soft_bounce: "soft_bounce",
  spam: "complaint",
  unsubscribed: "unsubscribed",
  opened: "opened",
  unique_opened: "opened",
  click: "clicked",
  error: "error",
  blocked: "error",
  invalid_email: "error",
};

const SUPPRESS_ON = new Set(["hard_bounce", "spam", "unsubscribed"]);

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.BREVO_WEBHOOK_SECRET || secret !== process.env.BREVO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = Array.isArray(body) ? body : [body];
  const supabase = createAdminClient();

  for (const raw of events) {
    const event = raw as { event?: string; email?: string; "message-id"?: string; date?: string };
    const brevoEvent = event.event;
    const type = brevoEvent ? EVENT_MAP[brevoEvent] : undefined;
    if (!type || !event.email) continue;

    const messageId = event["message-id"] || null;

    // Look up the original campaign send event so this webhook event tracks against the campaign
    let campaignId: string | null = null;
    let clientId: string | null = null;
    let leadId: string | null = null;

    if (messageId) {
      const { data: originalEvent } = await supabase
        .from("crm_email_events")
        .select("campaign_id, client_id, lead_id")
        .eq("message_id", messageId)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (originalEvent) {
        campaignId = originalEvent.campaign_id;
        clientId = originalEvent.client_id;
        leadId = originalEvent.lead_id;
      }
    }

    // Fallback: match by recent sent event to this recipient email if message-id wasn't found
    if (!campaignId) {
      const { data: fallbackEvent } = await supabase
        .from("crm_email_events")
        .select("campaign_id, client_id, lead_id")
        .eq("recipient_email", event.email)
        .eq("type", "sent")
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackEvent) {
        campaignId = fallbackEvent.campaign_id;
        clientId = fallbackEvent.client_id;
        leadId = fallbackEvent.lead_id;
      }
    }

    await supabase.from("crm_email_events").insert([
      {
        campaign_id: campaignId,
        client_id: clientId,
        lead_id: leadId,
        recipient_email: event.email,
        type,
        message_id: messageId,
        occurred_at: event.date ? new Date(event.date).toISOString() : new Date().toISOString(),
        meta: { raw_event: brevoEvent },
      },
    ]);

    if (brevoEvent && SUPPRESS_ON.has(brevoEvent)) {
      await supabase
        .from("crm_suppressions")
        .upsert([{ email: event.email.toLowerCase(), reason: brevoEvent === "spam" ? "complaint" : brevoEvent === "unsubscribed" ? "unsubscribed" : "hard_bounce" }], {
          onConflict: "email",
        });
    }
  }

  return NextResponse.json({ ok: true, processed: events.length });
}
