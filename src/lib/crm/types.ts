export type CrmClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  location: string | null;
  website: string | null;
  pain_points: string | null;
  proposed_solution: string | null;
  status: string;
  tags: string[];
  source: string | null;
  notes: string | null;
  created_at: string;
};

export type CrmLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
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
};

export type CrmPermissionsConfig = {
  pages: CrmPagesPermission;
  actions: CrmActionsPermission;
};

export type CrmUser = {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string;
  role_title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions?: CrmPermissionsConfig;
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
    invoices: true,
    finance: true,
    import: true,
    monitoring: true,
    settings: true,
    users: true,
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
  },
};

export const ROLE_PRESETS: Record<string, { label: string; description: string; permissions: CrmPermissionsConfig }> = {
  assistant: {
    label: "Personal Assistant",
    description: "Full management of leads, clients, campaigns and WhatsApp. Blocked from billing, finance, settings, and deleting records.",
    permissions: {
      pages: {
        dashboard: true,
        clients: true,
        leads: true,
        journeys: true,
        campaigns: true,
        whatsapp: true,
        invoices: false,
        finance: false,
        import: false,
        monitoring: false,
        settings: false,
        users: false,
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
      },
    },
  },
  sales: {
    label: "Sales & Outreach",
    description: "Focuses on pipeline and outreach: Leads, WhatsApp, and Campaigns. No access to clients or financial data.",
    permissions: {
      pages: {
        dashboard: true,
        clients: false,
        leads: true,
        journeys: true,
        campaigns: true,
        whatsapp: true,
        invoices: false,
        finance: false,
        import: false,
        monitoring: false,
        settings: false,
        users: false,
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
        invoices: true,
        finance: true,
        import: false,
        monitoring: false,
        settings: false,
        users: false,
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
      },
    },
  },
};

export type ActionResult = { success: true } | { error: string };
