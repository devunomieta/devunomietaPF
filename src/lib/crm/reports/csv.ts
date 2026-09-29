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
    ["REPORT: EXECUTIVE CRM SUMMARY", data.range.label],
    ["Total Active Clients", String(data.clientsSummary.totalClients)],
    ["New Clients", String(data.clientsSummary.newClientsCount)],
    ["Total Leads", String(data.leadsSummary.totalLeads)],
    ["Win Rate", `${data.leadsSummary.winRate}%`],
    ["Gross Invoiced", data.invoicesSummary.grossInvoiced.toFixed(2)],
    ["Cash Collected", data.invoicesSummary.netCollected.toFixed(2)],
    ["Total Receivables", data.invoicesSummary.totalOutstanding.toFixed(2)],
    [],
    ["TOP UNSETTLED INVOICES"],
    ["Invoice Number", "Client Name", "Total", "Balance Due", "Due Date", "Days Overdue"]
  ];

  for (const inv of data.topDebtors) {
    rows.push([
      inv.number,
      inv.clientName,
      inv.total.toFixed(2),
      inv.balance.toFixed(2),
      inv.effectiveDueDate,
      `${inv.daysOverdue} days`
    ]);
  }

  return rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
}
