export type WebhookPayload =
  | {
      event: "message.inbound";
      phone: string;
      message: string;
      messageId: string;
      timestamp: number;
    }
  | {
      event: "message.status";
      messageId: string;
      status: "sent" | "delivered" | "read" | "failed";
    }
  | {
      event: "connection.update";
      status: "connected" | "disconnected" | "logged_out";
      phone?: string;
    };

export async function forwardToCrmWebhook(payload: WebhookPayload): Promise<void> {
  const webhookUrl = process.env.CRM_WEBHOOK_URL;
  const webhookSecret = process.env.CRM_WEBHOOK_SECRET;

  if (!webhookUrl) return;

  try {
    const url = new URL(webhookUrl);
    if (webhookSecret) {
      url.searchParams.set("secret", webhookSecret);
    }

    await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.warn("[Baileys Webhook] Failed to forward event to CRM:", err instanceof Error ? err.message : err);
  }
}
