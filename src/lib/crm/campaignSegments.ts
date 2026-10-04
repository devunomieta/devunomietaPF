import { SupabaseClient } from "@supabase/supabase-js";

export type CampaignAudienceSegment = "unopened" | "opened_no_click" | "bounced";

export interface SegmentedRecipients {
  unopened: string[];
  opened_no_click: string[];
  bounced: string[];
}

export interface BouncedRecipientDetail {
  email: string;
  bounceType: "hard_bounce" | "soft_bounce";
  occurredAt: string;
  leadId: string | null;
  clientId: string | null;
  contactId: string | null;
  entityName?: string;
  contactName?: string;
}

/**
 * Computes audience segments for a campaign based on its event stream.
 */
export async function getCampaignAudienceSegments(
  supabase: SupabaseClient,
  campaignId: string
): Promise<SegmentedRecipients> {
  const { data: events } = await supabase
    .from("crm_email_events")
    .select("recipient_email, type, occurred_at")
    .eq("campaign_id", campaignId);

  if (!events || events.length === 0) {
    return { unopened: [], opened_no_click: [], bounced: [] };
  }

  const recipientMap = new Map<
    string,
    {
      delivered: boolean;
      opened: boolean;
      clicked: boolean;
      bounced: boolean;
    }
  >();

  for (const ev of events) {
    const email = ev.recipient_email?.trim().toLowerCase();
    if (!email) continue;

    let record = recipientMap.get(email);
    if (!record) {
      record = { delivered: false, opened: false, clicked: false, bounced: false };
      recipientMap.set(email, record);
    }

    if (ev.type === "delivered" || ev.type === "sent") {
      record.delivered = true;
    }
    if (ev.type === "opened") {
      record.opened = true;
    }
    if (ev.type === "clicked") {
      record.clicked = true;
    }
    if (ev.type === "soft_bounce" || ev.type === "hard_bounce") {
      record.bounced = true;
    }
  }

  const unopened: string[] = [];
  const opened_no_click: string[] = [];
  const bounced: string[] = [];

  recipientMap.forEach((rec, email) => {
    if (rec.bounced) {
      bounced.push(email);
      return;
    }
    if (rec.opened && !rec.clicked) {
      opened_no_click.push(email);
    } else if (rec.delivered && !rec.opened) {
      unopened.push(email);
    }
  });

  return { unopened, opened_no_click, bounced };
}
