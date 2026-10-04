import { createClient } from "@/utils/supabase/server";
import type { CrmJourneyStage } from "@/lib/crm/types";
import { getCampaignAudienceSegments, type CampaignAudienceSegment } from "@/lib/crm/campaignSegments";
import { NewCampaignForm } from "./NewCampaignForm";

export const metadata = { title: "New campaign · CRM" };

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    leadId?: string;
    draftId?: string;
    duplicateId?: string;
    resendCampaignId?: string;
    resendSegment?: CampaignAudienceSegment;
  }>;
}) {
  const { clientId, leadId, draftId, duplicateId, resendCampaignId, resendSegment } = await searchParams;
  const supabase = await createClient();

  const sourceCampaignId = draftId || duplicateId || resendCampaignId;

  const [
    { data: journey },
    recipientResult,
    { data: leadRows },
    { data: clientRows },
    { data: sourceCampaign },
    segmentedRecipients,
  ] = await Promise.all([
    supabase.from("crm_journeys").select("stages").eq("is_default", true).maybeSingle(),
    clientId
      ? supabase.from("crm_clients").select("id, name, email").eq("id", clientId).maybeSingle()
      : leadId
        ? supabase.from("crm_leads").select("id, name, email").eq("id", leadId).maybeSingle()
        : Promise.resolve({ data: null }),
    supabase.from("crm_leads").select("tags, created_at").not("tags", "is", null).order("created_at", { ascending: false }).limit(1000),
    supabase.from("crm_clients").select("tags, created_at").not("tags", "is", null).order("created_at", { ascending: false }).limit(1000),
    sourceCampaignId
      ? supabase.from("crm_email_campaigns").select("*").eq("id", sourceCampaignId).maybeSingle()
      : Promise.resolve({ data: null }),
    resendCampaignId
      ? getCampaignAudienceSegments(supabase, resendCampaignId)
      : Promise.resolve(null),
  ]);

  const stages = ((journey?.stages as CrmJourneyStage[] | undefined) || []).sort((a, b) => a.position - b.position);

  // Preserve recency of tag usage across records
  const recentTagsList: string[] = [];
  const seenTags = new Set<string>();

  const combinedRows = [...(leadRows || []), ...(clientRows || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const row of combinedRows) {
    for (const tag of row.tags || []) {
      const clean = tag?.trim();
      if (clean && !seenTags.has(clean)) {
        seenTags.add(clean);
        recentTagsList.push(clean);
      }
    }
  }

  const availableTags = recentTagsList;

  let targetedCustomEmails: string[] | undefined = undefined;
  let computedSubject = sourceCampaign?.subject || "";

  if (sourceCampaign && resendSegment && segmentedRecipients) {
    if (resendSegment === "unopened") {
      targetedCustomEmails = segmentedRecipients.unopened;
      computedSubject = sourceCampaign.subject.startsWith("Follow-up:") 
        ? sourceCampaign.subject 
        : `Follow-up: ${sourceCampaign.subject}`;
    } else if (resendSegment === "opened_no_click") {
      targetedCustomEmails = segmentedRecipients.opened_no_click;
      computedSubject = sourceCampaign.subject.startsWith("Reminder:") 
        ? sourceCampaign.subject 
        : `Reminder: ${sourceCampaign.subject}`;
    } else if (resendSegment === "bounced") {
      targetedCustomEmails = segmentedRecipients.bounced;
    }
  } else if (duplicateId && sourceCampaign) {
    computedSubject = `Copy of ${sourceCampaign.subject}`;
  }

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {resendSegment === "unopened"
            ? "Resend to Unopened Recipients"
            : resendSegment === "opened_no_click"
            ? "Resend to Non-Clickers"
            : resendSegment === "bounced"
            ? "Resend to Bounced Recipients"
            : "New campaign"}
        </h1>
        <p className="text-sm text-muted">
          {resendSegment
            ? `Retargeting ${targetedCustomEmails?.length || 0} recipient(s) from campaign "${sourceCampaign?.subject}". You can fine-tune the message, subject, or recipient list before sending.`
            : "Send to one person, or a filtered audience."}
        </p>
      </div>
      <NewCampaignForm
        stages={stages}
        availableTags={availableTags}
        prefillRecipient={recipientResult.data ? { ...recipientResult.data, clientId: clientId || null, leadId: leadId || null } : null}
        initialDraft={sourceCampaign ? {
          id: draftId ? sourceCampaign.id : null,
          subject: computedSubject,
          html: sourceCampaign.html,
          audience: targetedCustomEmails
            ? { customEmails: targetedCustomEmails }
            : sourceCampaign.audience,
          kind: targetedCustomEmails ? "custom" : sourceCampaign.kind,
        } : null}
      />
    </div>
  );
}
