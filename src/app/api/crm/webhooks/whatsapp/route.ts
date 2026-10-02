import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Universal WhatsApp Webhook receiver.
 * Handles events from:
 * 1. The new Baileys bridge (Render)
 * 2. Legacy Green-API
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");
  const secretHeader = request.headers.get("x-webhook-secret");

  const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET || process.env.GREEN_API_WEBHOOK_SECRET;

  if (expectedSecret && secretParam !== expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // A. HANDLE BAILEYS BRIDGE EVENT FORMAT
  if (body.event === "message.inbound") {
    const phone = String(body.phone || "").replace(/[^\d+]/g, "").trim();
    const message = String(body.message || "").trim();
    const messageId = String(body.messageId || "");

    if (phone) {
      await processInboundMessage(supabase, phone, message, messageId);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.event === "message.status" && body.messageId && body.status) {
    const status = String(body.status);
    await supabase.from("crm_whatsapp_events").update({ status }).eq("provider_message_id", String(body.messageId));
    return NextResponse.json({ ok: true });
  }

  // B. HANDLE LEGACY GREEN-API FORMAT (Backward Compatibility)
  if (body.typeWebhook === "incomingMessageReceived") {
    const rawSender = (body.senderData as { sender?: string })?.sender;
    const phone = rawSender?.replace("@c.us", "")?.replace(/[^\d+]/g, "").trim() || null;
    const message = (body.messageData as { textMessageData?: { textMessage?: string } })?.textMessageData?.textMessage || null;
    const messageId = String(body.idMessage || "");

    if (phone) {
      await processInboundMessage(supabase, phone, message || "", messageId);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.typeWebhook === "outgoingMessageStatus" && body.idMessage && body.status) {
    const statusMap: Record<string, string> = { sent: "sent", delivered: "delivered", read: "read", failed: "failed" };
    const status = statusMap[String(body.status)];
    if (status) {
      await supabase.from("crm_whatsapp_events").update({ status }).eq("provider_message_id", String(body.idMessage));
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// Helper to record inbound messages and handle STOP opt-outs
async function processInboundMessage(
  supabase: ReturnType<typeof createAdminClient>,
  cleanPhone: string,
  message: string,
  messageId: string
) {
  const cleanMsg = message.toLowerCase().trim();

  // Check for opt-out / STOP keywords
  const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "cancel", "opt out", "optout", "remove me", "quit"];
  const isOptOut = OPT_OUT_KEYWORDS.some((kw) => cleanMsg === kw || cleanMsg.startsWith(`${kw} `) || cleanMsg.endsWith(` ${kw}`));

  if (isOptOut) {
    try {
      await supabase.from("crm_suppressions").upsert([
        {
          email: cleanPhone,
          reason: "unsubscribed",
        },
      ]);

      const { createCrmNotification } = await import("@/lib/crm/notifications");
      await createCrmNotification({
        title: `WhatsApp Opt-Out Received (${cleanPhone})`,
        message: `Contact with phone ${cleanPhone} replied "${message}" and has been automatically added to suppressions.`,
        category: "whatsapp",
        severity: "warning",
        required_page_permission: "whatsapp",
        link_url: "/crm/whatsapp",
        group_key: `optout_${cleanPhone}`,
      });
    } catch (suppErr) {
      console.error("Failed to record WhatsApp suppression:", suppErr);
    }
  }

  const { data: client } = await supabase.from("crm_clients").select("id").eq("phone", cleanPhone).maybeSingle();
  const { data: lead } = !client ? await supabase.from("crm_leads").select("id").eq("phone", cleanPhone).maybeSingle() : { data: null };

  await supabase.from("crm_whatsapp_events").insert([
    {
      client_id: client?.id || null,
      lead_id: lead?.id || null,
      direction: "inbound",
      phone: cleanPhone,
      message,
      status: "delivered",
      provider_message_id: messageId || null,
    },
  ]);
}
