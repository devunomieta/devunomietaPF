export type CrmClient = {
  id: string;
  name: string;
  email: string | null;
  additional_emails?: string[];
  phone: string | null;
  company: string | null;
  company_domain?: string | null;
  location: string | null;
  website: string | null;
  pain_points: string | null;
  proposed_solution: string | null;
  status: string;
  tags: string[];
  source: string | null;
  notes: string | null;
  co_handled_by?: string | null;
  created_at: string;
};

export type CrmLead = {
  id: string;
  name: string;
  email: string | null;
  additional_emails?: string[];
  phone: string | null;
  company: string | null;
  company_domain?: string | null;
  location: string | null;
  website: string | null;
  pain_points: string | null;
  proposed_solution: string | null;
  source: string | null;
  score: number;
  status: "open" | "won" | "lost";
  journey_id: string | null;
  current_stage_key: string;
  converted_to_client_id: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
};

export type CrmContact = {
  id: string;
  client_id: string | null;
  lead_id: string | null;
  name: string;
  role: string | null;
  email: string | null;
  additional_emails?: string[];
  phone: string | null;
  created_at: string;
};

export type CrmJourneyStage = {
  key: string;
  label: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
};

export type CrmJourney = {
  id: string;
  name: string;
  stages: CrmJourneyStage[];
  is_default: boolean;
  created_at: string;
};

export type CrmStageEvent = {
  id: string;
  journey_id: string | null;
  client_id: string | null;
  lead_id: string | null;
  stage_key: string;
  note: string | null;
  entered_at: string;
};

export type CrmJobType = "import" | "bulk_send" | "bulk_whatsapp";
export type CrmJobStatus = "queued" | "processing" | "done" | "failed" | "canceled";

export type CrmJob = {
  id: string;
  type: CrmJobType;
  status: CrmJobStatus;
  payload: Record<string, unknown>;
  progress: number;
  total: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmSettings = {
  id: string;
  business_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  logo_url: string | null;
  brand_color: string;
  invoice_prefix: string;
  invoice_footer_note: string | null;
  default_currency: string;
  default_tax_rate: number;
  brevo_daily_cap: number;
  whatsapp_enabled: boolean;
  bounce_alert_threshold: number;
  complaint_alert_threshold: number;
  report_notification_emails?: string[];
  report_auto_send?: boolean;
  report_send_day_of_month?: number;
  report_default_due_days?: number;
};

export type CrmEmailEventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "soft_bounce"
  | "hard_bounce"
  | "complaint"
  | "unsubscribed"
  | "error";

export type CrmInvoiceLineItem = {
  description: string;
  qty: number;
  unit_price: number;
};

export type CrmInvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partially_paid"
  | "paid"
  | "overpaid"
  | "overdue"
  | "void";

export type CrmInvoice = {
  id: string;
  client_id: string;
  number: string;
  status: CrmInvoiceStatus;
  currency: string;
  line_items: CrmInvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  due_date: string | null;
  notes: string | null;
  sent_at: string | null;
  co_handled_by?: string | null;
  direct_service_cost?: number;
  declared_profit?: number | null;
  assistant_profit_share?: number | null;
  created_at: string;
};

export type CrmInvoicePaymentChannel = "bank_transfer" | "cash" | "mobile_money" | "card" | "other";

export type CrmInvoicePayment = {
  id: string;
  invoice_id: string;
  amount: number;
  channel: CrmInvoicePaymentChannel;
  paid_at: string;
  reference: string | null;
  receipt_url: string | null;
  created_at: string;
};

export type CrmPagesPermission = {
  dashboard: boolean;
  clients: boolean;
  leads: boolean;
  journeys: boolean;
  campaigns: boolean;
  whatsapp: boolean;
  invoices: boolean;
  finance: boolean;
  import: boolean;
  monitoring: boolean;
  settings: boolean;
  users: boolean;
  mailbox: boolean;
  notifications: boolean;
};

export type CrmNotificationCategory =
  | "lead"
  | "client"
  | "mailbox"
  | "whatsapp"
  | "campaign"
  | "monitoring"
  | "invoice"
  | "finance"
  | "system"
  | "user";

export type CrmNotificationSeverity = "info" | "success" | "warning" | "critical";

export type CrmNotification = {
  id: string;
  user_id: string | null;
  target_role: string | null;
  required_page_permission: keyof CrmPagesPermission | null;
  title: string;
  message: string;
  category: CrmNotificationCategory;
  severity: CrmNotificationSeverity;
  link_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  group_key: string | null;
  group_count: number;
  is_read: boolean;
  read_at: string | null;
  read_by: string | null;
  is_archived: boolean;
  snoozed_until: string | null;
  reminder_count: number;
  actor_email: string | null;
  actor_name: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmNotificationPreferences = {
  user_email: string;
  sound_enabled: boolean;
  browser_push_enabled: boolean;
  push_subscription: Record<string, unknown> | null;
  email_digest_enabled: boolean;
  email_digest_frequency: "instant" | "daily" | "off";
  category_toggles: Record<CrmNotificationCategory, boolean>;
  updated_at: string;
};

export type CrmActionsPermission = {
  clients_edit: boolean;
  clients_delete: boolean;
  leads_edit: boolean;
  leads_delete: boolean;
  invoices_create: boolean;
  invoices_delete: boolean;
  campaigns_send: boolean;
  whatsapp_send: boolean;
  mailbox_send: boolean;
  mailbox_view: boolean;
};

export type CrmPermissionsConfig = {
  pages: CrmPagesPermission;
  actions: CrmActionsPermission;
};

export type CrmThread = {
  id: string;
  subject: string;
  normalized_subject: string;
  recipient_email: string;
  recipient_name: string | null;
  last_message_preview: string | null;
  last_message_at: string;
  unread_count: number;
  is_starred: boolean;
  is_archived: boolean;
  folder: "inbox" | "sent" | "archive" | "trash";
  channel?: "email" | "whatsapp" | "mixed";
  client_id: string | null;
  lead_id: string | null;
  contact_id?: string | null;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string } | null;
  lead?: { id: string; name: string } | null;
  contact?: { id: string; name: string; role: string | null; email: string | null } | null;
};

export type CrmInternalNote = {
  id: string;
  client_id: string | null;
  lead_id: string | null;
  thread_id: string | null;
  author_email: string;
  author_name: string;
  content: string;
  created_at: string;
};

export type CrmCommunicationTemplate = {
  id: string;
  title: string;
  shortcut: string;
  channel: "all" | "email" | "whatsapp";
  subject: string | null;
  body: string;
  category: string;
  created_at: string;
};

export type CrmMessage = {
  id: string;
  thread_id: string;
  direction: "inbound" | "outbound";
  from_email: string;
  from_name: string | null;
  reply_to?: string | null;
  to_recipients: Array<{ email: string; name?: string }>;
  cc_recipients: Array<{ email: string; name?: string }>;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  references_header: string | null;
  attachments: Array<{ name: string; url?: string; size?: number; contentType?: string }>;
  security_status?: "verified" | "unverified" | "suspicious";
  sent_at: string;
  created_at: string;
};

export type CrmTeamAgreement = {
  id: string;
  user_id: string;
  auth_user_id: string | null;
  version: string;
  title: string;
  terms_hash: string;
  terms_text: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  signed_at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  device_summary?: string | null;
  status: "pending" | "signed" | "revoked";
  principal_name: string;
  principal_title: string;
  created_at: string;
  updated_at: string;
};

export type CrmUser = {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string;
  role_title: string;
  is_active: boolean;
  agreement_status?: "pending" | "signed" | "revoked";
  agreement_signed_at?: string | null;
  created_at: string;
  updated_at: string;
  permissions?: CrmPermissionsConfig;
  agreement?: CrmTeamAgreement | null;
};

export type CrmAuditLog = {
  id: string;
  actor_email: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const SUPER_ADMIN_PERMISSIONS: CrmPermissionsConfig = {
  pages: {
    dashboard: true,
    clients: true,
    leads: true,
    journeys: true,
    campaigns: true,
    whatsapp: true,
    mailbox: true,
    invoices: true,
    finance: true,
    import: true,
    monitoring: true,
    settings: true,
    users: true,
    notifications: true,
  },
  actions: {
    clients_edit: true,
    clients_delete: true,
    leads_edit: true,
    leads_delete: true,
    invoices_create: true,
    invoices_delete: true,
    campaigns_send: true,
    whatsapp_send: true,
    mailbox_send: true,
    mailbox_view: true,
  },
};

export const ROLE_PRESETS: Record<string, { label: string; description: string; permissions: CrmPermissionsConfig }> = {
  assistant: {
    label: "Personal Assistant",
    description: "Full management of leads, clients, campaigns, WhatsApp and Mailbox. Blocked from billing, finance, settings, and deleting records.",
    permissions: {
      pages: {
        dashboard: true,
        clients: true,
        leads: true,
        journeys: true,
        campaigns: true,
        whatsapp: true,
        mailbox: true,
        invoices: false,
        finance: false,
        import: false,
        monitoring: false,
        settings: false,
        users: false,
        notifications: true,
      },
      actions: {
        clients_edit: true,
        clients_delete: false,
        leads_edit: true,
        leads_delete: false,
        invoices_create: false,
        invoices_delete: false,
        campaigns_send: true,
        whatsapp_send: true,
        mailbox_send: true,
        mailbox_view: true,
      },
    },
  },
  sales: {
    label: "Sales & Outreach",
    description: "Focuses on pipeline, mailbox, and outreach: Leads, WhatsApp, and Campaigns. No access to clients or financial data.",
    permissions: {
      pages: {
        dashboard: true,
        clients: false,
        leads: true,
        journeys: true,
        campaigns: true,
        whatsapp: true,
        mailbox: true,
        invoices: false,
        finance: false,
        import: false,
        monitoring: false,
        settings: false,
        users: false,
        notifications: true,
      },
      actions: {
        clients_edit: false,
        clients_delete: false,
        leads_edit: true,
        leads_delete: false,
        invoices_create: false,
        invoices_delete: false,
        campaigns_send: true,
        whatsapp_send: true,
        mailbox_send: true,
        mailbox_view: true,
      },
    },
  },
  billing: {
    label: "Billing & Ops",
    description: "Manages invoices, client records, and financial overview. No access to campaigns or system settings.",
    permissions: {
      pages: {
        dashboard: true,
        clients: true,
        leads: false,
        journeys: false,
        campaigns: false,
        whatsapp: false,
        mailbox: false,
        invoices: true,
        finance: true,
        import: false,
        monitoring: false,
        settings: false,
        users: false,
        notifications: true,
      },
      actions: {
        clients_edit: true,
        clients_delete: false,
        leads_edit: false,
        leads_delete: false,
        invoices_create: true,
        invoices_delete: false,
        campaigns_send: false,
        whatsapp_send: false,
        mailbox_send: false,
        mailbox_view: false,
      },
    },
  },
};

export type ActionResult = { success: true } | { error: string };
