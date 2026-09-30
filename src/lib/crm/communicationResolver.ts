import { createAdminClient } from "@/utils/supabase/admin";

export type ResolvedEntityIdentity = {
  clientId: string | null;
  leadId: string | null;
  contactId: string | null;
  matchedVia: "contact_exact" | "contact_secondary" | "client_exact" | "client_secondary" | "lead_exact" | "lead_secondary" | "company_domain" | "none";
  entityName?: string;
  contactName?: string;
  contactRole?: string;
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
