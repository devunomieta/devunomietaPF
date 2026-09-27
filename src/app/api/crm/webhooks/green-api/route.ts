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
      const { data: client } = await supabase.from("crm_clients").select("id").eq("phone", phone).maybeSingle();
      const { data: lead } = !client ? await supabase.from("crm_leads").select("id").eq("phone", phone).maybeSingle() : { data: null };

      await supabase.from("crm_whatsapp_events").insert([
        {
          client_id: client?.id || null,
          lead_id: lead?.id || null,
          direction: "inbound",
          phone,
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
