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

    await supabase.from("crm_email_events").insert([
      {
        recipient_email: event.email,
        type,
        message_id: event["message-id"] || null,
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
