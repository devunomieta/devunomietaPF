import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

// Configure this URL (with ?secret=...) as the "Webhook URL" in your GREEN-API instance
// settings (green-api.com → your instance → Settings). See docs/CRM_SETUP.md.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.GREEN_API_WEBHOOK_SECRET || secret !== process.env.GREEN_API_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    typeWebhook?: string;
    messageData?: { textMessageData?: { textMessage?: string } };
    senderData?: { sender?: string };
    idMessage?: string;
    status?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (body.typeWebhook === "incomingMessageReceived") {
    const phone = body.senderData?.sender?.replace("@c.us", "") || null;
    const message = body.messageData?.textMessageData?.textMessage || null;
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+]/g, "").trim();
      const cleanMsg = (message || "").trim().toLowerCase();

      // Check for opt-out / STOP keywords
      const OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "cancel", "opt out", "optout", "remove me", "quit"];
      const isOptOut = OPT_OUT_KEYWORDS.some((kw) => cleanMsg === kw || cleanMsg.startsWith(`${kw} `) || cleanMsg.endsWith(` ${kw}`));

      if (isOptOut) {
        try {
          await supabase.from("crm_suppressions").upsert([
            {
              email: cleanPhone, // using suppression table with phone number key
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

      const { data: client } = await supabase.from("crm_clients").select("id").eq("phone", phone).maybeSingle();
      const { data: lead } = !client ? await supabase.from("crm_leads").select("id").eq("phone", phone).maybeSingle() : { data: null };

      await supabase.from("crm_whatsapp_events").insert([
        {
          client_id: client?.id || null,
          lead_id: lead?.id || null,
          direction: "inbound",
          phone: cleanPhone,
          message,
          status: "delivered",
        },
      ]);
    }
  } else if (body.typeWebhook === "outgoingMessageStatus" && body.idMessage && body.status) {
    const statusMap: Record<string, string> = { sent: "sent", delivered: "delivered", read: "read", failed: "failed" };
    const status = statusMap[body.status];
    if (status) {
      await supabase.from("crm_whatsapp_events").update({ status }).eq("provider_message_id", body.idMessage);
    }
  }

  return NextResponse.json({ ok: true });
}
