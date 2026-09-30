import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmSettings } from "@/lib/crm/types";

export type ReportCadence = "monthly" | "yearly";

export type DateRange = {
  startDate: string; // ISO string
  endDate: string; // ISO string
  label: string; // "September 2026" or "Year 2026"
  year: number;
  month?: number; // 1-12
};

export function getDateRange(cadence: ReportCadence, year: number, month?: number): DateRange {
  if (cadence === "monthly") {
    const m = month && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;
    const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      label: `${monthNames[m - 1]} ${year}`,
      year,
      month: m,
    };
  } else {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      label: `Year ${year}`,
      year,
    };
  }
}

export type ClientReportItem = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  classification: "new" | "brought_forward";
  created_at: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
  invoicesCount: number;
  currency: string;
  invoices: {
    id: string;
    number: string;
    total: number;
    paid: number;
    balance: number;
    status: string;
    created_at: string;
  }[];
  contacts: { name: string; role: string | null; email: string | null; phone: string | null }[];
};

export type ClientsReportData = {
  range: DateRange;
  settings: CrmSettings | null;
  summary: {
    totalClients: number;
    newClientsCount: number;
    broughtForwardCount: number;
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    currency: string;
  };
  clients: ClientReportItem[];
};

export type LeadReportItem = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  classification: "new" | "carried_over";
  score: number;
  status: "open" | "won" | "lost";
  current_stage_key: string;
  current_stage_label: string;
  isStalled: boolean; // no stage event for > 21 days
  daysSinceLastActivity: number;
  created_at: string;
  converted_to_client_id: string | null;
  stageHistory: { stage_key: string; stage_label?: string; entered_at: string }[];
};

export type LeadsReportData = {
  range: DateRange;
  settings: CrmSettings | null;
  summary: {
    totalLeads: number;
    newLeadsCount: number;
    carriedOverCount: number;
    wonCount: number;
    lostCount: number;
    openCount: number;
    winRate: number; // percentage
    stalledCount: number;
  };
  leads: LeadReportItem[];
};

export type InvoiceReportItem = {
  id: string;
  number: string;
  clientName: string;
  clientCompany: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  totalPaid: number;
  balance: number;
  due_date: string | null;
  effectiveDueDate: string;
  daysOverdue: number;
  agingBucket: "current" | "overdue_30" | "critical_60";
  isOverdue: boolean;
  created_at: string;
  payments: { amount: number; channel: string; paid_at: string; reference: string | null }[];
};

export type InvoicesReportData = {
  range: DateRange;
  settings: CrmSettings | null;
  summary: {
    totalInvoices: number;
    grossInvoiced: number;
    netCollected: number;
    totalOutstanding: number;
    currency: string;
    agingCurrent: { amount: number; count: number };
    agingOverdue30: { amount: number; count: number };
    agingCritical60: { amount: number; count: number };
    paymentChannelsBreakdown: Record<string, number>;
  };
  invoices: InvoiceReportItem[];
};

export type ExecutiveReportData = {
  range: DateRange;
  settings: CrmSettings | null;
  clientsSummary: ClientsReportData["summary"];
  leadsSummary: LeadsReportData["summary"];
  invoicesSummary: InvoicesReportData["summary"];
  topDebtors: InvoiceReportItem[]; // top unpaid accounts
  stalledLeads: LeadReportItem[];
  recentMilestones: { title: string; subtitle: string; date: string; tag: string }[];
  allClients: ClientReportItem[];
  allLeads: LeadReportItem[];
  allInvoices: InvoiceReportItem[];
};

export async function fetchClientsReportData(
  supabase: SupabaseClient,
  range: DateRange
): Promise<ClientsReportData> {
  const { data: settings } = await supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle();
  const defaultCurrency = settings?.default_currency || "NGN";

  // Fetch all clients active or created up to period end
  const { data: clients } = await supabase
    .from("crm_clients")
    .select("id, name, company, email, phone, status, created_at")
    .lte("created_at", range.endDate)
    .order("created_at", { ascending: false });

  // Fetch all invoices up to period end
  const { data: invoices } = await supabase
    .from("crm_invoices")
    .select("id, client_id, number, status, total, currency, created_at")
    .lte("created_at", range.endDate);

  // Fetch payments
  const invoiceIds = (invoices || []).map((i) => i.id);
  let payments: { invoice_id: string; amount: number; paid_at: string }[] = [];
  if (invoiceIds.length > 0) {
    const { data: pData } = await supabase
      .from("crm_invoice_payments")
      .select("invoice_id, amount, paid_at")
      .in("invoice_id", invoiceIds);
    payments = pData || [];
  }

  // Fetch contacts
  const clientIds = (clients || []).map((c) => c.id);
  let contacts: { client_id: string; name: string; role: string | null; email: string | null; phone: string | null }[] = [];
  if (clientIds.length > 0) {
    const { data: cData } = await supabase
      .from("crm_contacts")
      .select("client_id, name, role, email, phone")
      .in("client_id", clientIds);
    contacts = cData || [];
  }

  const paymentsByInvoice = new Map<string, number>();
  for (const p of payments) {
    paymentsByInvoice.set(p.invoice_id, (paymentsByInvoice.get(p.invoice_id) || 0) + Number(p.amount));
  }

  const clientItems: ClientReportItem[] = [];
  let totalBilledAll = 0;
  let totalPaidAll = 0;
  let totalOutstandingAll = 0;
  let newCount = 0;
  let bfCount = 0;

  for (const c of clients || []) {
    const isNew = c.created_at >= range.startDate && c.created_at <= range.endDate;
    if (isNew) newCount++;
    else bfCount++;

    const clientInvoices = (invoices || []).filter((i) => i.client_id === c.id);
    let billed = 0;
    let paid = 0;

    const formattedInvoices = clientInvoices.map((inv) => {
      const invPaid = paymentsByInvoice.get(inv.id) || 0;
      const invTotal = Number(inv.total) || 0;
      const invBal = Math.max(0, invTotal - invPaid);
      billed += invTotal;
      paid += invPaid;
      return {
        id: inv.id,
        number: inv.number,
        total: invTotal,
        paid: invPaid,
        balance: invBal,
        status: inv.status,
        created_at: inv.created_at,
      };
    });

    const clientBalance = Math.max(0, billed - paid);
    totalBilledAll += billed;
    totalPaidAll += paid;
    totalOutstandingAll += clientBalance;

    const clientContacts = contacts.filter((ct) => ct.client_id === c.id).map((ct) => ({
      name: ct.name,
      role: ct.role,
      email: ct.email,
      phone: ct.phone,
    }));

    clientItems.push({
      id: c.id,
      name: c.name,
      company: c.company,
      email: c.email,
      phone: c.phone,
      classification: isNew ? "new" : "brought_forward",
      created_at: c.created_at,
      totalBilled: billed,
      totalPaid: paid,
      balance: clientBalance,
      invoicesCount: formattedInvoices.length,
      currency: clientInvoices[0]?.currency || defaultCurrency,
      invoices: formattedInvoices,
      contacts: clientContacts,
    });
  }

  return {
    range,
    settings: settings as CrmSettings | null,
    summary: {
      totalClients: clientItems.length,
      newClientsCount: newCount,
      broughtForwardCount: bfCount,
      totalBilled: totalBilledAll,
      totalPaid: totalPaidAll,
      totalOutstanding: totalOutstandingAll,
      currency: defaultCurrency,
    },
    clients: clientItems,
  };
}

export async function fetchLeadsReportData(
  supabase: SupabaseClient,
  range: DateRange
): Promise<LeadsReportData> {
  const { data: settings } = await supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle();

  // Fetch journeys for stage labels
  const { data: journeys } = await supabase.from("crm_journeys").select("id, stages");
  const stageLabels = new Map<string, string>();
  for (const j of journeys || []) {
    for (const s of j.stages || []) {
      if (s.key && s.label) stageLabels.set(s.key, s.label);
    }
  }

  // Fetch leads created or active in period
  const { data: leads } = await supabase
    .from("crm_leads")
    .select("id, name, company, email, phone, score, status, current_stage_key, converted_to_client_id, created_at")
    .lte("created_at", range.endDate)
    .order("created_at", { ascending: false });

  // Fetch stage events
  const leadIds = (leads || []).map((l) => l.id);
  let stageEvents: { lead_id: string; stage_key: string; entered_at: string }[] = [];
  if (leadIds.length > 0) {
    const { data: seData } = await supabase
      .from("crm_stage_events")
      .select("lead_id, stage_key, entered_at")
      .in("lead_id", leadIds)
      .order("entered_at", { ascending: false });
    stageEvents = seData || [];
  }

  const eventsByLead = new Map<string, { stage_key: string; stage_label?: string; entered_at: string }[]>();
  for (const ev of stageEvents) {
    const list = eventsByLead.get(ev.lead_id) || [];
    list.push({
      stage_key: ev.stage_key,
      stage_label: stageLabels.get(ev.stage_key) || ev.stage_key,
      entered_at: ev.entered_at,
    });
    eventsByLead.set(ev.lead_id, list);
  }

  const now = new Date(range.endDate).getTime();
  let newLeads = 0;
  let carriedOver = 0;
  let won = 0;
  let lost = 0;
  let open = 0;
  let stalled = 0;

  const leadItems: LeadReportItem[] = [];

  for (const l of leads || []) {
    const isNew = l.created_at >= range.startDate && l.created_at <= range.endDate;
    if (isNew) newLeads++;
    else carriedOver++;

    if (l.status === "won") won++;
    else if (l.status === "lost") lost++;
    else open++;

    const history = eventsByLead.get(l.id) || [];
    const latestEventDate = history[0]?.entered_at ? new Date(history[0].entered_at).getTime() : new Date(l.created_at).getTime();
    const daysSince = Math.max(0, Math.floor((now - latestEventDate) / (1000 * 60 * 60 * 24)));
    const isStalled = l.status === "open" && daysSince > 21;
    if (isStalled) stalled++;

    leadItems.push({
      id: l.id,
      name: l.name,
      company: l.company,
      email: l.email,
      phone: l.phone,
      classification: isNew ? "new" : "carried_over",
      score: l.score || 0,
      status: l.status,
      current_stage_key: l.current_stage_key,
      current_stage_label: stageLabels.get(l.current_stage_key) || l.current_stage_key,
      isStalled,
      daysSinceLastActivity: daysSince,
      created_at: l.created_at,
      converted_to_client_id: l.converted_to_client_id,
      stageHistory: history,
    });
  }

  const total = leadItems.length;
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return {
    range,
    settings: settings as CrmSettings | null,
    summary: {
      totalLeads: total,
      newLeadsCount: newLeads,
      carriedOverCount: carriedOver,
      wonCount: won,
      lostCount: lost,
      openCount: open,
      winRate,
      stalledCount: stalled,
    },
    leads: leadItems,
  };
}

export async function fetchInvoicesReportData(
  supabase: SupabaseClient,
  range: DateRange
): Promise<InvoicesReportData> {
  const { data: settings } = await supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle();
  const defaultCurrency = settings?.default_currency || "NGN";
  const defaultNetDays = settings?.report_default_due_days || 14;

  // Invoices created in period OR active unsettled during period
  const { data: invoices } = await supabase
    .from("crm_invoices")
    .select("id, client_id, number, status, currency, subtotal, tax_amount, total, due_date, created_at")
    .lte("created_at", range.endDate)
    .order("created_at", { ascending: false });

  // Clients map for names
  const { data: clients } = await supabase.from("crm_clients").select("id, name, company");
  const clientMap = new Map<string, { name: string; company: string | null }>();
  for (const c of clients || []) clientMap.set(c.id, { name: c.name, company: c.company });

  // Payments
  const invoiceIds = (invoices || []).map((i) => i.id);
  let payments: { invoice_id: string; amount: number; channel: string; paid_at: string; reference: string | null }[] = [];
  if (invoiceIds.length > 0) {
    const { data: pData } = await supabase
      .from("crm_invoice_payments")
      .select("invoice_id, amount, channel, paid_at, reference")
      .in("invoice_id", invoiceIds)
      .order("paid_at", { ascending: false });
    payments = pData || [];
  }

  const paymentsMap = new Map<string, { amount: number; channel: string; paid_at: string; reference: string | null }[]>();
  for (const p of payments) {
    const list = paymentsMap.get(p.invoice_id) || [];
    list.push(p);
    paymentsMap.set(p.invoice_id, list);
  }

  const reportDate = new Date(range.endDate).getTime();
  let grossInvoiced = 0;
  let netCollected = 0;
  let totalOutstanding = 0;

  let currentAging = { amount: 0, count: 0 };
  let overdue30Aging = { amount: 0, count: 0 };
  let critical60Aging = { amount: 0, count: 0 };
  const channelsBreakdown: Record<string, number> = {};

  const items: InvoiceReportItem[] = [];

  for (const inv of invoices || []) {
    const client = clientMap.get(inv.client_id) || { name: "Client", company: null };
    const invPayments = paymentsMap.get(inv.id) || [];
    const paidTotal = invPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    const invTotal = Number(inv.total) || 0;
    const balance = Math.max(0, invTotal - paidTotal);

    // Calculate effective due date
    let effectiveDueDate = inv.due_date;
    if (!effectiveDueDate) {
      const createdDate = new Date(inv.created_at);
      createdDate.setDate(createdDate.getDate() + defaultNetDays);
      effectiveDueDate = createdDate.toISOString().split("T")[0];
    }

    const dueTime = new Date(effectiveDueDate).getTime();
    const daysOverdue = balance > 0 && reportDate > dueTime
      ? Math.max(0, Math.floor((reportDate - dueTime) / (1000 * 60 * 60 * 24)))
      : 0;

    const isOverdue = daysOverdue > 0 && balance > 0;

    let agingBucket: "current" | "overdue_30" | "critical_60" = "current";
    if (balance > 0) {
      if (daysOverdue > 60) {
        agingBucket = "critical_60";
        critical60Aging.amount += balance;
        critical60Aging.count++;
      } else if (daysOverdue > 30) {
        agingBucket = "overdue_30";
        overdue30Aging.amount += balance;
        overdue30Aging.count++;
      } else {
        agingBucket = "current";
        currentAging.amount += balance;
        currentAging.count++;
      }
    }

    // Accumulate channel stats for payments recorded in this period
    for (const p of invPayments) {
      if (p.paid_at >= range.startDate.split("T")[0] && p.paid_at <= range.endDate.split("T")[0]) {
        channelsBreakdown[p.channel] = (channelsBreakdown[p.channel] || 0) + Number(p.amount);
        netCollected += Number(p.amount);
      }
    }

    // Count in period's gross invoice if issued in period
    const inPeriod = inv.created_at >= range.startDate && inv.created_at <= range.endDate;
    if (inPeriod) {
      grossInvoiced += invTotal;
    }
    totalOutstanding += balance;

    items.push({
      id: inv.id,
      number: inv.number,
      clientName: client.name,
      clientCompany: client.company,
      status: inv.status,
      currency: inv.currency || defaultCurrency,
      subtotal: Number(inv.subtotal) || 0,
      tax_amount: Number(inv.tax_amount) || 0,
      total: invTotal,
      totalPaid: paidTotal,
      balance,
      due_date: inv.due_date,
      effectiveDueDate,
      daysOverdue,
      agingBucket,
      isOverdue,
      created_at: inv.created_at,
      payments: invPayments,
    });
  }

  return {
    range,
    settings: settings as CrmSettings | null,
    summary: {
      totalInvoices: items.length,
      grossInvoiced,
      netCollected,
      totalOutstanding,
      currency: defaultCurrency,
      agingCurrent: currentAging,
      agingOverdue30: overdue30Aging,
      agingCritical60: critical60Aging,
      paymentChannelsBreakdown: channelsBreakdown,
    },
    invoices: items,
  };
}

export async function fetchExecutiveReportData(
  supabase: SupabaseClient,
  range: DateRange
): Promise<ExecutiveReportData> {
  const [clientsData, leadsData, invoicesData] = await Promise.all([
    fetchClientsReportData(supabase, range),
    fetchLeadsReportData(supabase, range),
    fetchInvoicesReportData(supabase, range),
  ]);

  // Top Debtors (invoices with highest unpaid balances)
  const topDebtors = invoicesData.invoices
    .filter((inv) => inv.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10);

  // Stalled Leads
  const stalledLeads = leadsData.leads
    .filter((l) => l.isStalled)
    .slice(0, 10);

  // Recent Milestones
  const recentMilestones: { title: string; subtitle: string; date: string; tag: string }[] = [];

  for (const c of clientsData.clients.filter((cl) => cl.classification === "new").slice(0, 5)) {
    recentMilestones.push({
      title: `New Client Onboarded: ${c.name}`,
      subtitle: c.company || "Direct Client",
      date: new Date(c.created_at).toLocaleDateString(),
      tag: "Client",
    });
  }

  for (const l of leadsData.leads.filter((ld) => ld.status === "won").slice(0, 5)) {
    recentMilestones.push({
      title: `Lead Won: ${l.name}`,
      subtitle: l.company || "Won Pipeline",
      date: new Date(l.created_at).toLocaleDateString(),
      tag: "Lead Won",
    });
  }

  return {
    range,
    settings: clientsData.settings,
    clientsSummary: clientsData.summary,
    leadsSummary: leadsData.summary,
    invoicesSummary: invoicesData.summary,
    topDebtors,
    stalledLeads,
    recentMilestones,
    allClients: clientsData.clients,
    allLeads: leadsData.leads,
    allInvoices: invoicesData.invoices,
  };
}
