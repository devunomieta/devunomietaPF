import { createAdminClient } from "@/utils/supabase/admin";

export type ResolvedEntityIdentity = {
  clientId: string | null;
  leadId: string | null;
  contactId: string | null;
  matchedVia: "contact_exact" | "contact_secondary" | "client_exact" | "client_secondary" | "lead_exact" | "lead_secondary" | "company_domain" | "none";
  entityName?: string;
  contactName?: string;
  contactRole?: string;
  company?: string;
};

// Domains that should NEVER be used for domain-level fallback matching
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
]);

/**
 * Extracts a normalized domain from an email or URL string
 */
export function extractCleanDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase();
  if (cleaned.includes("@")) {
    const parts = cleaned.split("@");
    return parts[parts.length - 1] || null;
  }
  // If it's a URL
  try {
    const urlString = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
    const parsed = new URL(urlString);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return cleaned.replace(/^www\./, "").split("/")[0] || null;
  }
}

/**
 * Resolve client, lead, and contact association from an email address
 */
export async function resolveEntityFromEmail(rawEmail: string): Promise<ResolvedEntityIdentity> {
  const cleanEmail = rawEmail.trim().toLowerCase();
  const supabase = createAdminClient();

  // 1. Check crm_contacts (both primary email & additional_emails)
  // Check primary contact email
  const { data: contactExact } = await supabase
    .from("crm_contacts")
    .select("id, name, role, client_id, lead_id")
    .ilike("email", cleanEmail)
    .limit(1)
    .maybeSingle();

  if (contactExact) {
    return {
      clientId: contactExact.client_id,
      leadId: contactExact.lead_id,
      contactId: contactExact.id,
      matchedVia: "contact_exact",
      contactName: contactExact.name,
      contactRole: contactExact.role || undefined,
    };
  }

  // Check additional_emails array on contacts
  const { data: contactSecondary } = await supabase
    .from("crm_contacts")
    .select("id, name, role, client_id, lead_id")
    .contains("additional_emails", [cleanEmail])
    .limit(1)
    .maybeSingle();

  if (contactSecondary) {
    return {
      clientId: contactSecondary.client_id,
      leadId: contactSecondary.lead_id,
      contactId: contactSecondary.id,
      matchedVia: "contact_secondary",
      contactName: contactSecondary.name,
      contactRole: contactSecondary.role || undefined,
    };
  }

  // 2. Check crm_clients (primary email & additional_emails)
  const { data: clientExact } = await supabase
    .from("crm_clients")
    .select("id, name")
    .ilike("email", cleanEmail)
    .limit(1)
    .maybeSingle();

  if (clientExact) {
    return {
      clientId: clientExact.id,
      leadId: null,
      contactId: null,
      matchedVia: "client_exact",
      entityName: clientExact.name,
    };
  }

  const { data: clientSecondary } = await supabase
    .from("crm_clients")
    .select("id, name")
    .contains("additional_emails", [cleanEmail])
    .limit(1)
    .maybeSingle();

  if (clientSecondary) {
    return {
      clientId: clientSecondary.id,
      leadId: null,
      contactId: null,
      matchedVia: "client_secondary",
      entityName: clientSecondary.name,
    };
  }

  // 3. Check crm_leads (primary email & additional_emails)
  const { data: leadExact } = await supabase
    .from("crm_leads")
    .select("id, name")
    .ilike("email", cleanEmail)
    .limit(1)
    .maybeSingle();

  if (leadExact) {
    return {
      clientId: null,
      leadId: leadExact.id,
      contactId: null,
      matchedVia: "lead_exact",
      entityName: leadExact.name,
    };
  }

  const { data: leadSecondary } = await supabase
    .from("crm_leads")
    .select("id, name")
    .contains("additional_emails", [cleanEmail])
    .limit(1)
    .maybeSingle();

  if (leadSecondary) {
    return {
      clientId: null,
      leadId: leadSecondary.id,
      contactId: null,
      matchedVia: "lead_secondary",
      entityName: leadSecondary.name,
    };
  }

  // 4. Company Domain Fallback Matching
  const domain = extractCleanDomain(cleanEmail);
  if (domain && !GENERIC_EMAIL_DOMAINS.has(domain)) {
    // Check client website or company_domain
    const { data: clientDomainMatch } = await supabase
      .from("crm_clients")
      .select("id, name")
      .or(`company_domain.ilike.%${domain}%,website.ilike.%${domain}%`)
      .limit(1)
      .maybeSingle();

    if (clientDomainMatch) {
      return {
        clientId: clientDomainMatch.id,
        leadId: null,
        contactId: null,
        matchedVia: "company_domain",
        entityName: clientDomainMatch.name,
      };
    }

    // Check lead website or company_domain
    const { data: leadDomainMatch } = await supabase
      .from("crm_leads")
      .select("id, name")
      .or(`company_domain.ilike.%${domain}%,website.ilike.%${domain}%`)
      .limit(1)
      .maybeSingle();

    if (leadDomainMatch) {
      return {
        clientId: null,
        leadId: leadDomainMatch.id,
        contactId: null,
        matchedVia: "company_domain",
        entityName: leadDomainMatch.name,
      };
    }
  }

  return {
    clientId: null,
    leadId: null,
    contactId: null,
    matchedVia: "none",
  };
}

/**
 * Batch resolve entities for an array of emails.
 * Handles primary & additional emails on contacts, clients, and leads.
 */
export async function batchResolveEntitiesFromEmails(
  emails: string[]
): Promise<Map<string, ResolvedEntityIdentity>> {
  const map = new Map<string, ResolvedEntityIdentity>();
  if (!emails || emails.length === 0) return map;

  const normalizedEmails = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  );

  const supabase = createAdminClient();

  // 1. Fetch contacts matching any email or additional_emails
  const { data: contactsData } = await supabase
    .from("crm_contacts")
    .select("id, name, role, email, additional_emails, client_id, lead_id");

  // 2. Fetch clients
  const { data: clientsData } = await supabase
    .from("crm_clients")
    .select("id, name, email, additional_emails, website, company_domain");

  // 3. Fetch leads
  const { data: leadsData } = await supabase
    .from("crm_leads")
    .select("id, name, email, additional_emails, website, company_domain");

  type ContactRecord = {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    additional_emails: string[] | null;
    client_id: string | null;
    lead_id: string | null;
  };

  type EntityRecord = {
    id: string;
    name: string;
    email: string | null;
    additional_emails: string[] | null;
    website: string | null;
    company_domain: string | null;
  };

  // Index contacts
  const contactExactMap = new Map<string, ContactRecord>();
  const contactSecMap = new Map<string, ContactRecord>();
  for (const c of (contactsData || []) as ContactRecord[]) {
    if (c.email) contactExactMap.set(c.email.trim().toLowerCase(), c);
    if (Array.isArray(c.additional_emails)) {
      for (const sec of c.additional_emails) {
        if (sec) contactSecMap.set(sec.trim().toLowerCase(), c);
      }
    }
  }

  // Index clients
  const clientExactMap = new Map<string, EntityRecord>();
  const clientSecMap = new Map<string, EntityRecord>();
  for (const cl of (clientsData || []) as EntityRecord[]) {
    if (cl.email) clientExactMap.set(cl.email.trim().toLowerCase(), cl);
    if (Array.isArray(cl.additional_emails)) {
      for (const sec of cl.additional_emails) {
        if (sec) clientSecMap.set(sec.trim().toLowerCase(), cl);
      }
    }
  }

  // Index leads
  const leadExactMap = new Map<string, EntityRecord>();
  const leadSecMap = new Map<string, EntityRecord>();
  for (const ld of (leadsData || []) as EntityRecord[]) {
    if (ld.email) leadExactMap.set(ld.email.trim().toLowerCase(), ld);
    if (Array.isArray(ld.additional_emails)) {
      for (const sec of ld.additional_emails) {
        if (sec) leadSecMap.set(sec.trim().toLowerCase(), ld);
      }
    }
  }

  for (const cleanEmail of normalizedEmails) {
    // 1. Contact exact
    if (contactExactMap.has(cleanEmail)) {
      const c = contactExactMap.get(cleanEmail)!;
      map.set(cleanEmail, {
        clientId: c.client_id,
        leadId: c.lead_id,
        contactId: c.id,
        matchedVia: "contact_exact",
        contactName: c.name,
        contactRole: c.role || undefined,
      });
      continue;
    }

    // 2. Contact secondary
    if (contactSecMap.has(cleanEmail)) {
      const c = contactSecMap.get(cleanEmail)!;
      map.set(cleanEmail, {
        clientId: c.client_id,
        leadId: c.lead_id,
        contactId: c.id,
        matchedVia: "contact_secondary",
        contactName: c.name,
        contactRole: c.role || undefined,
      });
      continue;
    }

    // 3. Client exact
    if (clientExactMap.has(cleanEmail)) {
      const cl = clientExactMap.get(cleanEmail)!;
      map.set(cleanEmail, {
        clientId: cl.id,
        leadId: null,
        contactId: null,
        matchedVia: "client_exact",
        entityName: cl.name,
      });
      continue;
    }

    // 4. Client secondary
    if (clientSecMap.has(cleanEmail)) {
      const cl = clientSecMap.get(cleanEmail)!;
      map.set(cleanEmail, {
        clientId: cl.id,
        leadId: null,
        contactId: null,
        matchedVia: "client_secondary",
        entityName: cl.name,
      });
      continue;
    }

    // 5. Lead exact
    if (leadExactMap.has(cleanEmail)) {
      const ld = leadExactMap.get(cleanEmail)!;
      map.set(cleanEmail, {
        clientId: null,
        leadId: ld.id,
        contactId: null,
        matchedVia: "lead_exact",
        entityName: ld.name,
      });
      continue;
    }

    // 6. Lead secondary
    if (leadSecMap.has(cleanEmail)) {
      const ld = leadSecMap.get(cleanEmail)!;
      map.set(cleanEmail, {
        clientId: null,
        leadId: ld.id,
        contactId: null,
        matchedVia: "lead_secondary",
        entityName: ld.name,
      });
      continue;
    }

    // 7. Domain matching fallback
    const domain = extractCleanDomain(cleanEmail);
    if (domain && !GENERIC_EMAIL_DOMAINS.has(domain)) {
      const clDomain = (clientsData || []).find(
        (cl) =>
          extractCleanDomain(cl.company_domain) === domain ||
          extractCleanDomain(cl.website) === domain
      );
      if (clDomain) {
        map.set(cleanEmail, {
          clientId: clDomain.id,
          leadId: null,
          contactId: null,
          matchedVia: "company_domain",
          entityName: clDomain.name,
        });
        continue;
      }

      const ldDomain = (leadsData || []).find(
        (ld) =>
          extractCleanDomain(ld.company_domain) === domain ||
          extractCleanDomain(ld.website) === domain
      );
      if (ldDomain) {
        map.set(cleanEmail, {
          clientId: null,
          leadId: ldDomain.id,
          contactId: null,
          matchedVia: "company_domain",
          entityName: ldDomain.name,
        });
        continue;
      }
    }

    map.set(cleanEmail, {
      clientId: null,
      leadId: null,
      contactId: null,
      matchedVia: "none",
    });
  }

  return map;
}

/**
 * Ensures a sent campaign email is recorded in crm_threads and crm_messages
 * so it immediately appears in the contact / lead / client communication timeline.
 */
export async function recordCampaignEmailInEntityFeed({
  recipientEmail,
  recipientName,
  subject,
  htmlContent,
  messageId,
  clientId,
  leadId,
  contactId,
}: {
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  htmlContent: string;
  messageId?: string | null;
  clientId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
}) {
  // Only record in thread feed if attached to a client or lead
  if (!clientId && !leadId) return;

  const adminDb = createAdminClient();
  const cleanEmail = recipientEmail.trim().toLowerCase();
  const cleanSubject = subject.trim() || "Campaign Message";
  const normalizedSub = cleanSubject
    .replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();

  const plainText = htmlContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const preview = plainText.slice(0, 140).trim();
  const sentAt = new Date().toISOString();
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "info@devunomieta.xyz";
  const senderName = process.env.BREVO_SENDER_NAME || "Joseph Unomieta";

  // Check if an existing thread exists for this entity and recipient email with matching normalized subject
  let threadQuery = adminDb
    .from("crm_threads")
    .select("id")
    .eq("recipient_email", cleanEmail)
    .eq("normalized_subject", normalizedSub)
    .limit(1);

  if (clientId) {
    threadQuery = threadQuery.eq("client_id", clientId);
  } else if (leadId) {
    threadQuery = threadQuery.eq("lead_id", leadId);
  }

  const { data: existingThread } = await threadQuery.maybeSingle();

  let targetThreadId = existingThread?.id;

  if (targetThreadId) {
    await adminDb
      .from("crm_threads")
      .update({
        last_message_preview: `Campaign: ${preview}`,
        last_message_at: sentAt,
        folder: "sent",
        updated_at: sentAt,
      })
      .eq("id", targetThreadId);
  } else {
    const { data: newThread, error: newThreadErr } = await adminDb
      .from("crm_threads")
      .insert([
        {
          subject: cleanSubject,
          normalized_subject: normalizedSub,
          recipient_email: cleanEmail,
          recipient_name: recipientName || null,
          last_message_preview: `Campaign: ${preview}`,
          last_message_at: sentAt,
          unread_count: 0,
          folder: "sent",
          client_id: clientId || null,
          lead_id: leadId || null,
          contact_id: contactId || null,
        },
      ])
      .select("id")
      .single();

    if (!newThreadErr && newThread) {
      targetThreadId = newThread.id;
    }
  }

  if (targetThreadId) {
    await adminDb.from("crm_messages").insert([
      {
        thread_id: targetThreadId,
        direction: "outbound",
        from_email: senderEmail,
        from_name: senderName,
        to_recipients: [{ email: cleanEmail, name: recipientName || undefined }],
        cc_recipients: [],
        subject: cleanSubject,
        body_text: plainText,
        body_html: htmlContent,
        message_id: messageId || null,
        sent_at: sentAt,
      },
    ]);
  }

  // Auto-promote lead to 'contacted' stage if currently in 'lead' stage
  if (leadId) {
    await autoPromoteLeadToContacted(leadId);
  }
}

/**
 * Automatically promotes a lead from 'lead' stage to 'contacted' stage.
 * If the lead is already in 'contacted' or any higher stage (qualified, proposal, won, etc.),
 * this function preserves their current stage and does not touch or demote them.
 */
export async function autoPromoteLeadToContacted(leadId: string): Promise<boolean> {
  if (!leadId) return false;
  const adminDb = createAdminClient();

  const { data: lead } = await adminDb
    .from("crm_leads")
    .select("id, current_stage_key")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return false;

  const currentStage = (lead.current_stage_key || "").trim().toLowerCase();
  // Only promote if strictly in 'lead' stage (or empty initial stage)
  if (currentStage === "lead" || !currentStage) {
    const { error } = await adminDb
      .from("crm_leads")
      .update({
        current_stage_key: "contacted",
      })
      .eq("id", leadId);

    if (!error) {
      console.log(`[Auto-Promote] Lead ${leadId} automatically promoted from '${currentStage}' to 'contacted' stage.`);
      return true;
    }
  }

  return false;
}

/**
 * Resolves lead or client entity from a phone number
 */
export async function resolveEntityFromPhone(rawPhone: string): Promise<ResolvedEntityIdentity> {
  const clean = rawPhone.replace(/[^\d+]/g, "").trim();
  if (!clean || clean.length < 6) {
    return { clientId: null, leadId: null, contactId: null, matchedVia: "none" };
  }

  const supabase = createAdminClient();
  const digitsOnly = clean.replace(/^\+/, "");

  // 1. Check crm_contacts by phone
  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("id, name, role, client_id, lead_id, phone")
    .or(`phone.ilike.%${digitsOnly}%`)
    .limit(1)
    .maybeSingle();

  if (contact) {
    let companyName: string | undefined;
    if (contact.client_id) {
      const { data: cl } = await supabase.from("crm_clients").select("name, company").eq("id", contact.client_id).maybeSingle();
      companyName = cl?.company || cl?.name || undefined;
    } else if (contact.lead_id) {
      const { data: ld } = await supabase.from("crm_leads").select("name, company").eq("id", contact.lead_id).maybeSingle();
      companyName = ld?.company || ld?.name || undefined;
    }

    return {
      clientId: contact.client_id,
      leadId: contact.lead_id,
      contactId: contact.id,
      matchedVia: "contact_exact",
      contactName: contact.name,
      contactRole: contact.role || undefined,
      company: companyName,
    };
  }

  // 2. Check crm_clients by phone
  const { data: client } = await supabase
    .from("crm_clients")
    .select("id, name, phone, company")
    .or(`phone.ilike.%${digitsOnly}%`)
    .limit(1)
    .maybeSingle();

  if (client) {
    return {
      clientId: client.id,
      leadId: null,
      contactId: null,
      matchedVia: "client_exact",
      entityName: client.name,
      company: client.company || client.name || undefined,
    };
  }

  // 3. Check crm_leads by phone
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, name, phone, company")
    .or(`phone.ilike.%${digitsOnly}%`)
    .limit(1)
    .maybeSingle();

  if (lead) {
    return {
      clientId: null,
      leadId: lead.id,
      contactId: null,
      matchedVia: "lead_exact",
      entityName: lead.name,
      company: lead.company || lead.name || undefined,
    };
  }

  return { clientId: null, leadId: null, contactId: null, matchedVia: "none" };
}

/**
 * Batch resolve entities for an array of phone numbers.
 * Matches across contacts, clients, and leads.
 */
export async function batchResolveEntitiesFromPhones(
  phones: string[]
): Promise<Map<string, ResolvedEntityIdentity>> {
  const map = new Map<string, ResolvedEntityIdentity>();
  if (!phones || phones.length === 0) return map;

  const supabase = createAdminClient();

  // Fetch candidate records
  const [{ data: contacts }, { data: clients }, { data: leads }] = await Promise.all([
    supabase.from("crm_contacts").select("id, name, role, phone, client_id, lead_id").not("phone", "is", null),
    supabase.from("crm_clients").select("id, name, phone").not("phone", "is", null),
    supabase.from("crm_leads").select("id, name, phone").not("phone", "is", null),
  ]);

  const cleanDigits = (p: string | null | undefined) => (p ? p.replace(/\D/g, "") : "");

  for (const rawPhone of phones) {
    const digits = cleanDigits(rawPhone);
    if (!digits || digits.length < 6) continue;

    // Check contact
    const contact = (contacts || []).find((c) => {
      const cDig = cleanDigits(c.phone);
      return cDig && (cDig.endsWith(digits) || digits.endsWith(cDig));
    });
    if (contact) {
      map.set(rawPhone, {
        clientId: contact.client_id,
        leadId: contact.lead_id,
        contactId: contact.id,
        matchedVia: "contact_exact",
        contactName: contact.name,
        contactRole: contact.role || undefined,
      });
      continue;
    }

    // Check client
    const client = (clients || []).find((cl) => {
      const clDig = cleanDigits(cl.phone);
      return clDig && (clDig.endsWith(digits) || digits.endsWith(clDig));
    });
    if (client) {
      map.set(rawPhone, {
        clientId: client.id,
        leadId: null,
        contactId: null,
        matchedVia: "client_exact",
        entityName: client.name,
      });
      continue;
    }

    // Check lead
    const lead = (leads || []).find((ld) => {
      const ldDig = cleanDigits(ld.phone);
      return ldDig && (ldDig.endsWith(digits) || digits.endsWith(ldDig));
    });
    if (lead) {
      map.set(rawPhone, {
        clientId: null,
        leadId: lead.id,
        contactId: null,
        matchedVia: "lead_exact",
        entityName: lead.name,
      });
      continue;
    }

    map.set(rawPhone, {
      clientId: null,
      leadId: null,
      contactId: null,
      matchedVia: "none",
    });
  }

  return map;
}


