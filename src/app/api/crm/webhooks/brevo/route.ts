import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";

// Configure this URL (with ?secret=...) as a webhook in Brevo → Transactional → Settings → Webhooks,
// for the events: delivered, hard_bounce/hardBounce, soft_bounce/softBounce, spam, unsubscribed, open/opened, click, error, blocked.
const EVENT_MAP: Record<string, string> = {
  delivered: "delivered",
  hard_bounce: "hard_bounce",
  hardbounce: "hard_bounce",
  soft_bounce: "soft_bounce",
  softbounce: "soft_bounce",
  spam: "complaint",
  unsubscribed: "unsubscribed",
  open: "opened",
  opened: "opened",
  unique_open: "opened",
  unique_opened: "opened",
  uniqueopened: "opened",
  proxyopen: "opened",
  proxy_open: "opened",
  click: "clicked",
  clicked: "clicked",
  error: "error",
  blocked: "error",
  invalid: "error",
  invalid_email: "error",
};

const SUPPRESS_ON = new Set(["hard_bounce", "hardbounce", "spam", "unsubscribed"]);

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
    const event = raw as {
      event?: string;
      email?: string;
      "message-id"?: string;
      messageId?: string;
      date?: string;
      link?: string;
      url?: string;
    };

    const rawEventName = event.event ? event.event.trim().toLowerCase() : "";
    const type = rawEventName ? EVENT_MAP[rawEventName] : undefined;
    if (!type || !event.email) continue;

    const rawMessageId = event["message-id"] || event.messageId || null;
    const cleanMessageId = rawMessageId ? rawMessageId.trim().replace(/^<|>$/g, "") : null;
    const linkUrl = event.link || event.url || null;

    // Look up the original campaign send event so this webhook event tracks against the campaign
    let campaignId: string | null = null;
    let clientId: string | null = null;
    let leadId: string | null = null;

    if (cleanMessageId || rawMessageId) {
      // Try exact match or match without angle brackets
      let query = supabase
        .from("crm_email_events")
        .select("campaign_id, client_id, lead_id")
        .order("occurred_at", { ascending: false })
        .limit(1);

      if (rawMessageId && cleanMessageId && rawMessageId !== cleanMessageId) {
        query = query.or(`message_id.eq.${rawMessageId},message_id.eq.<${cleanMessageId}>,message_id.eq.${cleanMessageId}`);
      } else {
        query = query.eq("message_id", rawMessageId || cleanMessageId);
      }

      const { data: originalEvent } = await query.maybeSingle();

      if (originalEvent) {
        campaignId = originalEvent.campaign_id;
        clientId = originalEvent.client_id;
        leadId = originalEvent.lead_id;
      }
    }

    // Fallback: match by recent sent event to this recipient email ONLY if sent within 15 minutes of the webhook event
    if (!campaignId) {
      const eventTime = event.date ? new Date(event.date).getTime() : Date.now();
      const fifteenMinutesBefore = new Date(eventTime - 15 * 60 * 1000).toISOString();

      const { data: fallbackEvent } = await supabase
        .from("crm_email_events")
        .select("campaign_id, client_id, lead_id")
        .eq("recipient_email", event.email)
        .eq("type", "sent")
        .gte("occurred_at", fifteenMinutesBefore)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackEvent) {
        campaignId = fallbackEvent.campaign_id;
        clientId = fallbackEvent.client_id;
        leadId = fallbackEvent.lead_id;
      }
    }

    const { error: insertError } = await supabase.from("crm_email_events").insert([
      {
        campaign_id: campaignId,
        client_id: clientId,
        lead_id: leadId,
        recipient_email: event.email,
        type,
        message_id: rawMessageId || cleanMessageId,
        occurred_at: event.date ? new Date(event.date).toISOString() : new Date().toISOString(),
        meta: {
          raw_event: event.event,
          ...(linkUrl ? { link_url: linkUrl } : {}),
        },
      },
    ]);

    if (insertError) {
      console.error("[Brevo Webhook] Failed to insert event:", insertError.message, { type, email: event.email, campaignId });
    }

    if (rawEventName && SUPPRESS_ON.has(rawEventName)) {
      await supabase
        .from("crm_suppressions")
        .upsert(
          [
            {
              email: event.email.toLowerCase(),
              reason: rawEventName === "spam" ? "complaint" : rawEventName === "unsubscribed" ? "unsubscribed" : "hard_bounce",
            },
          ],
          { onConflict: "email" }
        );
    }
  }

  revalidatePath("/crm/campaigns");
  revalidatePath("/crm/monitoring");

  return NextResponse.json({ ok: true, processed: events.length });
}
