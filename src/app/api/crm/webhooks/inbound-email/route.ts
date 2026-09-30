import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Brevo Inbound Webhook parser.
 * Handles incoming emails received at the configured Brevo inbound domain or forwarded address.
 * Standard Brevo Inbound Webhook payload structure:
 * {
 *   "items": [
 *     {
 *       "Uuid": [...],
 *       "MessageId": "<...>",
 *       "InReplyTo": "<...>",
 *       "From": { "Address": "...", "Name": "..." },
 *       "To": [{ "Address": "...", "Name": "..." }],
 *       "Cc": [{ "Address": "...", "Name": "..." }],
 *       "Subject": "Re: Quote Request",
 *       "RawHtmlBody": "...",
 *       "ExtractedMarkdownMessage": "...",
 *       "Date": "...",
 *       "Attachments": [{ "Name": "...", "ContentType": "...", "ContentLength": 1234, "DownloadToken": "..." }]
 *     }
 *   ]
 * }
 * Also supports simplified / custom inbound forwarder JSON bodies.
 */

import { sanitizeEmailHtml, isAttachmentSafe, detectSpam } from "@/lib/sanitize";

// Max body length allowed to prevent DoS / storage abuse (500KB)
const MAX_BODY_LENGTH = 500 * 1024;

function normalizeSubject(subject: string): string {
  if (!subject) return "No Subject";
  return subject
    .replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  const expectedSecret = process.env.CRM_INBOUND_SECRET || process.env.BREVO_WEBHOOK_SECRET;
  const isAuthorized = !expectedSecret || secret === expectedSecret;

  return NextResponse.json({
    status: "ok",
    service: "CRM Inbound Email Webhook",
    authorized: isAuthorized,
    timestamp: new Date().toISOString(),
    message: isAuthorized
      ? "Webhook endpoint is operational and ready to receive Cloudflare/Brevo emails."
      : "Endpoint reachable, but secret provided does not match.",
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  // Allow either BREVO_WEBHOOK_SECRET or CRM_INBOUND_SECRET
  const expectedSecret = process.env.CRM_INBOUND_SECRET || process.env.BREVO_WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const rawItems = (body as { items?: unknown[] })?.items || (Array.isArray(body) ? body : [body]);

  let processedCount = 0;

  for (const raw of rawItems) {
    const item = raw as Record<string, any>;
    if (!item) continue;

    // 1. Extract sender & reply-to
    const fromAddress: string =
      item.From?.Address ||
      item.from?.email ||
      item.fromAddress ||
      item.from ||
      item.sender?.email ||
      "";
    const fromName: string =
      item.From?.Name ||
      item.from?.name ||
      item.fromName ||
      item.sender?.name ||
      fromAddress.split("@")[0] ||
      "";

    if (!fromAddress || !fromAddress.includes("@")) continue;

    const replyToAddress: string | null =
      item.reply_to || item.replyTo || item["reply-to"] || item.ReplyTo?.Address || null;

    // 2. Extract recipients
    const toRecipients: Array<{ email: string; name?: string }> = Array.isArray(item.To)
      ? item.To.map((t: any) => ({ email: t.Address || t.email, name: t.Name || t.name }))
      : Array.isArray(item.to)
      ? item.to.map((t: any) => ({ email: t.email || t.Address, name: t.name || t.Name }))
      : [{ email: String(item.to || "") }];

    const ccRecipients: Array<{ email: string; name?: string }> = Array.isArray(item.Cc)
      ? item.Cc.map((t: any) => ({ email: t.Address || t.email, name: t.Name || t.name }))
      : Array.isArray(item.cc)
      ? item.cc.map((t: any) => ({ email: t.email || t.Address, name: t.name || t.Name }))
      : [];

    const subject: string = (item.Subject || item.subject || "No Subject").trim();
    const normalizedSub = normalizeSubject(subject);

    // Security & Sanitization: Clean HTML and Plaintext
    const rawBodyHtml: string = (item.RawHtmlBody || item.html || item.body_html || "").slice(0, MAX_BODY_LENGTH);
    const sanitizedHtml = rawBodyHtml ? sanitizeEmailHtml(rawBodyHtml) : null;

    const rawBodyText: string = (
      item.ExtractedMarkdownMessage ||
      item.text ||
      item.body_text ||
      rawBodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
      ""
    ).slice(0, MAX_BODY_LENGTH);

    // Spam & Security checks (SPF, DKIM, DMARC from Cloudflare worker or payload)
    const spfVerdict = item.spf || item.security?.spf || "pass";
    const dkimVerdict = item.dkim || item.security?.dkim || "pass";
    const isAutoReply = Boolean(item.is_auto_reply || item.auto_submitted);

    const spamCheck = detectSpam({
      name: fromName,
      email: fromAddress,
      message: `${subject} ${rawBodyText}`,
    });

    let securityStatus: "verified" | "unverified" | "suspicious" = "verified";
    if (spamCheck.isSpam) {
      securityStatus = "suspicious";
    } else if (spfVerdict === "fail" || dkimVerdict === "fail") {
      securityStatus = "unverified";
    }

    const messageId: string | null = item.MessageId || item["message-id"] || item.messageId || null;
    const inReplyTo: string | null = item.InReplyTo || item["in-reply-to"] || item.inReplyTo || null;
    const referencesHeader: string | null =
      item.References || item.references || (Array.isArray(item.References) ? item.References.join(" ") : null);
    const sentAt: string = item.Date ? new Date(item.Date).toISOString() : new Date().toISOString();

    // Security: Filter attachments and drop executable/dangerous extensions
    const rawAttachments = Array.isArray(item.Attachments)
      ? item.Attachments
      : Array.isArray(item.attachments)
      ? item.attachments
      : [];

    const attachments = rawAttachments
      .filter((a: any) => {
        const name = a.Name || a.name || "";
        return isAttachmentSafe(name);
      })
      .map((a: any) => ({
        name: a.Name || a.name || "attachment",
        contentType: a.ContentType || a.contentType || "application/octet-stream",
        size: a.ContentLength || a.size || 0,
        url: a.DownloadToken || a.url || null,
      }));

    // 3. Find matched thread:
    // Match by InReplyTo message_id, or by normalized subject + participant email
    let threadId: string | null = null;
    let clientId: string | null = null;
    let leadId: string | null = null;

    if (inReplyTo) {
      const cleanInReplyTo = inReplyTo.replace(/^<|>$/g, "").trim();
      const { data: matchedMsg } = await supabase
        .from("crm_messages")
        .select("thread_id")
        .or(`message_id.eq.${inReplyTo},message_id.eq.<${cleanInReplyTo}>,message_id.eq.${cleanInReplyTo}`)
        .limit(1)
        .maybeSingle();

      if (matchedMsg?.thread_id) {
        threadId = matchedMsg.thread_id;
      } else {
        // Also check if this was a reply to a Campaign or transactional mail sent before Mailbox was created
        const { data: matchedEvent } = await supabase
          .from("crm_email_events")
          .select("campaign_id, client_id, lead_id")
          .or(`message_id.eq.${inReplyTo},message_id.eq.<${cleanInReplyTo}>,message_id.eq.${cleanInReplyTo}`)
          .limit(1)
          .maybeSingle();

        if (matchedEvent) {
          if (matchedEvent.client_id) clientId = matchedEvent.client_id;
          if (matchedEvent.lead_id) leadId = matchedEvent.lead_id;
        }
      }
    }

    if (!threadId) {
      // Find recent thread by recipient_email and normalized_subject
      const { data: existingThread } = await supabase
        .from("crm_threads")
        .select("id, client_id, lead_id")
        .eq("recipient_email", fromAddress.toLowerCase().trim())
        .eq("normalized_subject", normalizedSub)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingThread) {
        threadId = existingThread.id;
        clientId = existingThread.client_id;
        leadId = existingThread.lead_id;
      }
    }

    // 4. Resolve client / lead association if not already found
    if (!clientId && !leadId) {
      const cleanEmail = fromAddress.toLowerCase().trim();
      const [{ data: clientRow }, { data: leadRow }] = await Promise.all([
        supabase.from("crm_clients").select("id").eq("email", cleanEmail).limit(1).maybeSingle(),
        supabase.from("crm_leads").select("id").eq("email", cleanEmail).limit(1).maybeSingle(),
      ]);

      if (clientRow) clientId = clientRow.id;
      if (leadRow) leadId = leadRow.id;
    }

    const preview = rawBodyText.slice(0, 140).trim();

    // 5. Create thread if new
    if (!threadId) {
      const { data: newThread, error: threadErr } = await supabase
        .from("crm_threads")
        .insert([
          {
            subject,
            normalized_subject: normalizedSub,
            recipient_email: fromAddress.toLowerCase().trim(),
            recipient_name: fromName || null,
            last_message_preview: preview,
            last_message_at: sentAt,
            unread_count: 1,
            folder: "inbox",
            client_id: clientId,
            lead_id: leadId,
          },
        ])
        .select("id")
        .single();

      if (threadErr || !newThread) {
        console.error("[Inbound Email] Error creating thread:", threadErr?.message);
        continue;
      }
      threadId = newThread.id;
    } else {
      // Update existing thread unread count, folder, preview & last_message_at
      const { data: curr } = await supabase.from("crm_threads").select("unread_count").eq("id", threadId).single();
      const newUnread = (curr?.unread_count || 0) + 1;

      await supabase
        .from("crm_threads")
        .update({
          last_message_preview: preview,
          last_message_at: sentAt,
          unread_count: newUnread,
          folder: "inbox", // Bring back to inbox if new reply
          updated_at: new Date().toISOString(),
        })
        .eq("id", threadId);
    }

    // 6. Insert message
    const { error: msgErr } = await supabase.from("crm_messages").insert([
      {
        thread_id: threadId,
        direction: "inbound",
        from_email: fromAddress.toLowerCase().trim(),
        from_name: fromName || null,
        reply_to: replyToAddress ? replyToAddress.toLowerCase().trim() : null,
        to_recipients: toRecipients,
        cc_recipients: ccRecipients,
        subject,
        body_text: rawBodyText,
        body_html: sanitizedHtml,
        message_id: messageId,
        in_reply_to: inReplyTo,
        references_header: referencesHeader,
        attachments,
        security_status: securityStatus,
        raw_payload: item,
        sent_at: sentAt,
      },
    ]);

    if (msgErr) {
      console.error("[Inbound Email] Error inserting message:", msgErr.message);
    } else {
      processedCount++;
    }
  }

  revalidatePath("/crm/mailbox");
  revalidatePath("/crm");

  return NextResponse.json({ ok: true, processed: processedCount });
}
