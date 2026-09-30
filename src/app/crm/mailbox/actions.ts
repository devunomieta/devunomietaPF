"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getCrmAuthUser } from "@/lib/crm/auth";
import { sendEmail } from "@/lib/brevo";
import type { CrmThread, CrmMessage } from "@/lib/crm/types";

function normalizeSubject(subject: string): string {
  if (!subject) return "No Subject";
  return subject
    .replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
}

/**
 * Fetch threads for a folder, search query, or filter
 */
export async function getThreads({
  folder = "inbox",
  search = "",
  starredOnly = false,
}: {
  folder?: string;
  search?: string;
  starredOnly?: boolean;
}) {
  const authUser = await getCrmAuthUser();
  if (!authUser || !authUser.permissions.pages.mailbox) {
    throw new Error("Unauthorized to access mailbox");
  }

  const adminDb = createAdminClient();
  let query = adminDb
    .from("crm_threads")
    .select(`
      id,
      subject,
      normalized_subject,
      recipient_email,
      recipient_name,
      last_message_preview,
      last_message_at,
      unread_count,
      is_starred,
      is_archived,
      folder,
      client_id,
      lead_id,
      created_at,
      updated_at,
      client:crm_clients(id, name),
      lead:crm_leads(id, name)
    `)
    .order("last_message_at", { ascending: false });

  if (folder === "sent") {
    query = query.eq("folder", "sent");
  } else {
    // Default to inbox (include anything not explicitly marked sent)
    query = query.neq("folder", "sent");
  }

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`subject.ilike.%${s}%,recipient_email.ilike.%${s}%,recipient_name.ilike.%${s}%,last_message_preview.ilike.%${s}%`);
  }

  const { data, error } = await query.limit(50);
  if (error) {
    console.error("Failed to load threads:", error.message);
    return [];
  }

  return (data || []) as unknown as CrmThread[];
}

/**
 * Fetch all messages for a specific thread
 */
export async function getThreadMessages(threadId: string) {
  const authUser = await getCrmAuthUser();
  if (!authUser || !authUser.permissions.pages.mailbox) {
    throw new Error("Unauthorized");
  }

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("crm_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true });

  if (error) {
    console.error("Failed to load thread messages:", error.message);
    return [];
  }

  // Mark thread as read
  await adminDb
    .from("crm_threads")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("id", threadId);

  return (data || []) as CrmMessage[];
}

/**
 * Send an outbound reply to a thread
 */
export async function replyToThread({
  threadId,
  messageHtml,
  messageText,
}: {
  threadId: string;
  messageHtml: string;
  messageText: string;
}) {
  const authUser = await getCrmAuthUser();
  if (!authUser || !authUser.permissions.actions.mailbox_send) {
    return { error: "You don't have permission to send emails from mailbox" };
  }

  const adminDb = createAdminClient();

  // Load thread
  const { data: thread } = await adminDb
    .from("crm_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (!thread) return { error: "Thread not found" };

  // Load latest message in thread to extract in-reply-to headers
  const { data: lastMsg } = await adminDb
    .from("crm_messages")
    .select("message_id, references_header")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const replySubject = thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "";
  const senderName = authUser.displayName || process.env.BREVO_SENDER_NAME || "Portfolio Admin";

  const customHeaders: Record<string, string> = {};
  if (lastMsg?.message_id) {
    customHeaders["In-Reply-To"] = lastMsg.message_id;
    const prevRefs = lastMsg.references_header ? `${lastMsg.references_header} ` : "";
    customHeaders["References"] = `${prevRefs}${lastMsg.message_id}`.trim();
  }

  // Send via Brevo
  const sendRes = await sendEmail({
    to: [{ email: thread.recipient_email, name: thread.recipient_name || undefined }],
    subject: replySubject,
    htmlContent: messageHtml,
    headers: customHeaders,
  });

  if (sendRes.error) {
    return { error: sendRes.error };
  }

  const sentAt = new Date().toISOString();
  const preview = messageText.slice(0, 140).trim();

  // Insert message row
  await adminDb.from("crm_messages").insert([
    {
      thread_id: threadId,
      direction: "outbound",
      from_email: senderEmail,
      from_name: senderName,
      to_recipients: [{ email: thread.recipient_email, name: thread.recipient_name || undefined }],
      cc_recipients: [],
      subject: replySubject,
      body_text: messageText,
      body_html: messageHtml,
      message_id: sendRes.messageId || null,
      in_reply_to: lastMsg?.message_id || null,
      sent_at: sentAt,
    },
  ]);

  // Update thread
  await adminDb
    .from("crm_threads")
    .update({
      last_message_preview: `You: ${preview}`,
      last_message_at: sentAt,
      folder: thread.folder === "trash" ? "inbox" : thread.folder,
      updated_at: sentAt,
    })
    .eq("id", threadId);

  revalidatePath("/crm/mailbox");
  return { success: true };
}

/**
 * Compose and start a brand new email thread
 */
export async function composeNewEmail({
  toEmail,
  toName,
  subject,
  messageHtml,
  messageText,
  clientId,
  leadId,
}: {
  toEmail: string;
  toName?: string;
  subject: string;
  messageHtml: string;
  messageText: string;
  clientId?: string;
  leadId?: string;
}) {
  const authUser = await getCrmAuthUser();
  if (!authUser || !authUser.permissions.actions.mailbox_send) {
    return { error: "You don't have permission to compose emails" };
  }

  const cleanEmail = toEmail.toLowerCase().trim();
  const cleanSubject = subject.trim() || "No Subject";
  const normalizedSub = normalizeSubject(cleanSubject);
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "";
  const senderName = authUser.displayName || process.env.BREVO_SENDER_NAME || "Portfolio Admin";

  const sendRes = await sendEmail({
    to: [{ email: cleanEmail, name: toName || undefined }],
    subject: cleanSubject,
    htmlContent: messageHtml,
  });

  if (sendRes.error) {
    return { error: sendRes.error };
  }

  const adminDb = createAdminClient();
  const sentAt = new Date().toISOString();
  const preview = messageText.slice(0, 140).trim();

  // Create thread
  const { data: newThread, error: threadErr } = await adminDb
    .from("crm_threads")
    .insert([
      {
        subject: cleanSubject,
        normalized_subject: normalizedSub,
        recipient_email: cleanEmail,
        recipient_name: toName || null,
        last_message_preview: `You: ${preview}`,
        last_message_at: sentAt,
        unread_count: 0,
        folder: "sent",
        client_id: clientId || null,
        lead_id: leadId || null,
      },
    ])
    .select("id")
    .single();

  if (threadErr || !newThread) {
    return { error: threadErr?.message || "Failed to create thread" };
  }

  // Insert message
  await adminDb.from("crm_messages").insert([
    {
      thread_id: newThread.id,
      direction: "outbound",
      from_email: senderEmail,
      from_name: senderName,
      to_recipients: [{ email: cleanEmail, name: toName || undefined }],
      cc_recipients: [],
      subject: cleanSubject,
      body_text: messageText,
      body_html: messageHtml,
      message_id: sendRes.messageId || null,
      sent_at: sentAt,
    },
  ]);

  revalidatePath("/crm/mailbox");
  return { success: true, threadId: newThread.id };
}

/**
 * Toggle thread star status
 */
export async function toggleThreadStar(threadId: string, isStarred: boolean) {
  const authUser = await getCrmAuthUser();
  if (!authUser) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("crm_threads")
    .update({ is_starred: isStarred, updated_at: new Date().toISOString() })
    .eq("id", threadId);

  revalidatePath("/crm/mailbox");
  return { success: true };
}

/**
 * Move thread to folder (inbox, archive, trash)
 */
export async function moveThreadToFolder(threadId: string, folder: "inbox" | "archive" | "trash") {
  const authUser = await getCrmAuthUser();
  if (!authUser) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("crm_threads")
    .update({
      folder,
      is_archived: folder === "archive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId);

  revalidatePath("/crm/mailbox");
  return { success: true };
}

/**
 * Simulate receiving an inbound test reply (useful for testing webhook functionality locally or in dashboard)
 */
export async function simulateInboundReply({
  threadId,
  senderEmail,
  senderName,
  subject,
  message,
}: {
  threadId?: string;
  senderEmail: string;
  senderName?: string;
  subject: string;
  message: string;
}) {
  const authUser = await getCrmAuthUser();
  if (!authUser || !authUser.isSuperAdmin) {
    return { error: "Only Super Admin can simulate inbound emails" };
  }

  const adminDb = createAdminClient();
  const cleanEmail = senderEmail.toLowerCase().trim();
  const normalizedSub = normalizeSubject(subject);
  const sentAt = new Date().toISOString();
  const preview = message.slice(0, 140).trim();

  let targetThreadId = threadId;

  if (!targetThreadId) {
    const { data: created, error } = await adminDb
      .from("crm_threads")
      .insert([
        {
          subject,
          normalized_subject: normalizedSub,
          recipient_email: cleanEmail,
          recipient_name: senderName || null,
          last_message_preview: preview,
          last_message_at: sentAt,
          unread_count: 1,
          folder: "inbox",
        },
      ])
      .select("id")
      .single();

    if (error || !created) return { error: error?.message || "Failed to create thread" };
    targetThreadId = created.id;
  } else {
    const { data: curr } = await adminDb.from("crm_threads").select("unread_count").eq("id", targetThreadId).single();
    await adminDb
      .from("crm_threads")
      .update({
        last_message_preview: preview,
        last_message_at: sentAt,
        unread_count: (curr?.unread_count || 0) + 1,
        folder: "inbox",
        updated_at: sentAt,
      })
      .eq("id", targetThreadId);
  }

  await adminDb.from("crm_messages").insert([
    {
      thread_id: targetThreadId,
      direction: "inbound",
      from_email: cleanEmail,
      from_name: senderName || null,
      to_recipients: [{ email: process.env.BREVO_SENDER_EMAIL || "admin@portfolio.com" }],
      subject,
      body_text: message,
      body_html: `<p>${message.replace(/\n/g, "<br/>")}</p>`,
      message_id: `<simulated-${Date.now()}@inbound.local>`,
      sent_at: sentAt,
    },
  ]);

  revalidatePath("/crm/mailbox");
  return { success: true, threadId: targetThreadId };
}
