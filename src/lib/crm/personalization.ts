/**
 * CRM Personalization Utilities
 * Supports:
 * - {{first_name}}
 * - {{last_name}}
 * - {{name}} / {{full_name}}
 * - {{email}}
 * - {{company}}
 * - {{phone}}
 */

export interface PersonalizationRecipient {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  [key: string]: unknown;
}

export function personalizeText(template: string, recipient: PersonalizationRecipient): string {
  if (!template) return "";

  const fullName = (recipient.name || "").trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "there";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const email = (recipient.email || "").trim();
  const company = (recipient.company || "").trim() || "your team";
  const phone = (recipient.phone || "").trim();

  return template
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*last_name\s*\}\}/gi, lastName)
    .replace(/\{\{\s*(name|full_name)\s*\}\}/gi, fullName || firstName)
    .replace(/\{\{\s*email\s*\}\}/gi, email)
    .replace(/\{\{\s*company\s*\}\}/gi, company)
    .replace(/\{\{\s*phone\s*\}\}/gi, phone);
}

export const SUPPORTED_PERSONALIZATION_VARIABLES = [
  { tag: "{{first_name}}", label: "First Name", fallback: "there" },
  { tag: "{{last_name}}", label: "Last Name", fallback: "" },
  { tag: "{{name}}", label: "Full Name", fallback: "First name or there" },
  { tag: "{{company}}", label: "Company", fallback: "your team" },
  { tag: "{{email}}", label: "Email", fallback: "recipient email" },
  { tag: "{{phone}}", label: "Phone", fallback: "" },
];
