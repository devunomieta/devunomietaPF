import type { ClientsReportData, LeadsReportData, InvoicesReportData, ExecutiveReportData } from "./data";

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function serializeClientsCsv(data: ClientsReportData): string {
  const rows: string[][] = [
    ["REPORT: CLIENTS DIRECTORY", data.range.label],
    ["Total Clients", String(data.summary.totalClients)],
    ["New This Period", String(data.summary.newClientsCount)],
    ["Brought Forward", String(data.summary.broughtForwardCount)],
    ["Total Invoiced", String(data.summary.totalBilled)],
    ["Total Collected", String(data.summary.totalPaid)],
    ["Outstanding Balance", String(data.summary.totalOutstanding)],
    [],
    ["Name", "Company", "Email", "Phone", "Classification", "Total Invoiced", "Total Paid", "Balance Due", "Invoices Count", "Created Date"]
  ];

  for (const c of data.clients) {
    rows.push([
      c.name,
      c.company || "",
      c.email || "",
      c.phone || "",
      c.classification === "new" ? "New this period" : "Brought Forward",
      c.totalBilled.toFixed(2),
      c.totalPaid.toFixed(2),
      c.balance.toFixed(2),
      String(c.invoicesCount),
      new Date(c.created_at).toLocaleDateString()
    ]);
  }

  return rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
}

export function serializeLeadsCsv(data: LeadsReportData): string {
  const rows: string[][] = [
    ["REPORT: SALES LEADS & PIPELINE", data.range.label],
    ["Total Leads Managed", String(data.summary.totalLeads)],
    ["New Leads", String(data.summary.newLeadsCount)],
    ["Carried Over", String(data.summary.carriedOverCount)],
    ["Won Deals", String(data.summary.wonCount)],
    ["Lost Deals", String(data.summary.lostCount)],
    ["Active Open", String(data.summary.openCount)],
    ["Win Rate (%)", `${data.summary.winRate}%`],
    ["Stalled Leads (>21d)", String(data.summary.stalledCount)],
    [],
    ["Name", "Company", "Email", "Phone", "Cohort", "Status", "Current Stage", "Score", "Stalled (>21d)", "Created Date"]
  ];

  for (const l of data.leads) {
    rows.push([
      l.name,
      l.company || "",
      l.email || "",
      l.phone || "",
      l.classification === "new" ? "New this period" : "Carried Over",
      l.status.toUpperCase(),
      l.current_stage_label,
      String(l.score),
      l.isStalled ? `Yes (${l.daysSinceLastActivity}d idle)` : "No",
      new Date(l.created_at).toLocaleDateString()
    ]);
  }

  return rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
}

export function serializeInvoicesCsv(data: InvoicesReportData): string {
  const rows: string[][] = [
    ["REPORT: INVOICES & RECEIVABLES", data.range.label],
    ["Total Invoices", String(data.summary.totalInvoices)],
    ["Gross Invoiced", data.summary.grossInvoiced.toFixed(2)],
    ["Net Cash Collected", data.summary.netCollected.toFixed(2)],
    ["Total Outstanding", data.summary.totalOutstanding.toFixed(2)],
    ["Aging 0-30d", data.summary.agingCurrent.amount.toFixed(2)],
    ["Aging 31-60d", data.summary.agingOverdue30.amount.toFixed(2)],
    ["Aging 61+d (Critical)", data.summary.agingCritical60.amount.toFixed(2)],
    [],
    ["Invoice Number", "Client Name", "Client Company", "Status", "Currency", "Total Amount", "Amount Paid", "Balance Due", "Due Date", "Days Overdue", "Aging Category", "Issue Date"]
  ];

  for (const inv of data.invoices) {
    rows.push([
      inv.number,
      inv.clientName,
      inv.clientCompany || "",
      inv.status.toUpperCase(),
      inv.currency,
      inv.total.toFixed(2),
      inv.totalPaid.toFixed(2),
      inv.balance.toFixed(2),
      inv.effectiveDueDate,
      String(inv.daysOverdue),
      inv.agingBucket === "critical_60" ? "Critical (>60d)" : inv.agingBucket === "overdue_30" ? "Overdue (31-60d)" : "Current (0-30d)",
      new Date(inv.created_at).toLocaleDateString()
    ]);
  }

  return rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
}

export function serializeExecutiveCsv(data: ExecutiveReportData): string {
  const rows: string[][] = [
    ["REPORT: EXECUTIVE COMPREHENSIVE CRM DOSSIER", data.range.label],
    ["Generated At", new Date().toISOString()],
    [],
    ["1. EXECUTIVE KEY PERFORMANCE INDICATORS"],
    ["Metric", "Value"],
    ["Total Active Clients", String(data.clientsSummary.totalClients)],
    ["New Clients in Period", String(data.clientsSummary.newClientsCount)],
    ["Brought Forward Clients", String(data.clientsSummary.broughtForwardCount)],
    ["Total Leads in Pipeline", String(data.leadsSummary.totalLeads)],
    ["Deals Won", String(data.leadsSummary.wonCount)],
    ["Deals Lost", String(data.leadsSummary.lostCount)],
    ["Pipeline Win Rate", `${data.leadsSummary.winRate}%`],
    ["Total Invoices Issued", String(data.invoicesSummary.totalInvoices)],
    ["Gross Revenue Invoiced", data.invoicesSummary.grossInvoiced.toFixed(2)],
    ["Actual Cash Collected", data.invoicesSummary.netCollected.toFixed(2)],
    ["Total Outstanding Receivables", data.invoicesSummary.totalOutstanding.toFixed(2)],
    ["Current Receivables (0-30d)", data.invoicesSummary.agingCurrent.amount.toFixed(2)],
    ["Overdue Receivables (31-60d)", data.invoicesSummary.agingOverdue30.amount.toFixed(2)],
    ["Critical Delinquent (>60d)", data.invoicesSummary.agingCritical60.amount.toFixed(2)],
    [],
    ["2. COMPLETE CLIENT DIRECTORY & FINANCIAL POSITIONS"],
    ["Client Name", "Company", "Email", "Phone", "Classification", "Total Invoiced", "Total Paid", "Balance Due", "Currency"]
  ];

  for (const c of data.allClients || []) {
    rows.push([
      c.name,
      c.company || "",
      c.email || "",
      c.phone || "",
      c.classification === "new" ? "New Client" : "Brought Forward",
      c.totalBilled.toFixed(2),
      c.totalPaid.toFixed(2),
      c.balance.toFixed(2),
      c.currency
    ]);
  }

  rows.push([]);
  rows.push(["3. SALES LEADS & PIPELINE BREAKDOWN"]);
  rows.push(["Lead Name", "Company", "Email", "Phone", "Stage", "Score", "Status", "Idle Days", "Stalled Alert"]);

  for (const l of data.allLeads || []) {
    rows.push([
      l.name,
      l.company || "",
      l.email || "",
      l.phone || "",
      l.current_stage_label || l.current_stage_key,
      String(l.score),
      l.status.toUpperCase(),
      String(l.daysSinceLastActivity),
      l.isStalled ? "STALLED (>21d)" : "ACTIVE"
    ]);
  }

  rows.push([]);
  rows.push(["4. COMPLETE INVOICES & RECEIVABLES AGING"]);
  rows.push(["Invoice Number", "Client Name", "Company", "Status", "Total", "Paid", "Balance Due", "Due Date", "Days Overdue", "Aging Bucket"]);

  for (const inv of data.allInvoices || []) {
    rows.push([
      inv.number,
      inv.clientName,
      inv.clientCompany || "",
      inv.status.toUpperCase(),
      inv.total.toFixed(2),
      inv.totalPaid.toFixed(2),
      inv.balance.toFixed(2),
      inv.effectiveDueDate,
      String(inv.daysOverdue),
      inv.agingBucket === "critical_60" ? "Critical (>60d)" : inv.agingBucket === "overdue_30" ? "Overdue (31-60d)" : "Current (0-30d)"
    ]);
  }

  return rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
}
