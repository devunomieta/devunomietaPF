import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { formatMoney } from "@/lib/crm/currency";
import type { CrmInvoice, CrmInvoicePayment } from "@/lib/crm/types";

export const metadata = { title: "Finance · CRM" };

const CHANNEL_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  mobile_money: "Mobile money",
  card: "Card",
  other: "Other",
};

export default async function CrmFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = "30d" } = await searchParams;
  const supabase = await createClient();

  const since = new Date();
  if (period === "30d") since.setDate(since.getDate() - 30);
  else if (period === "90d") since.setDate(since.getDate() - 90);
  else since.setFullYear(2000);

  const [{ data: invoices }, { data: payments }] = await Promise.all([
    supabase.from("crm_invoices").select("*").gte("created_at", since.toISOString()).neq("status", "void"),
    supabase.from("crm_invoice_payments").select("*, crm_invoices(client_id, currency)").gte("paid_at", since.toISOString().slice(0, 10)),
  ]);

  const invoiceRows = (invoices as CrmInvoice[]) || [];
  const paymentRows = (payments as (CrmInvoicePayment & { crm_invoices: { client_id: string; currency: string } | null })[]) || [];

  const totalInvoiced = invoiceRows.reduce((sum, i) => sum + Number(i.total), 0);
  const totalCollected = paymentRows.reduce((sum, p) => sum + Number(p.amount), 0);

  const { data: allOpenInvoices } = await supabase
    .from("crm_invoices")
    .select("id, total, status")
    .in("status", ["sent", "viewed", "partially_paid", "overdue"]);

  const { data: allPaymentsForOpen } = await supabase
    .from("crm_invoice_payments")
    .select("invoice_id, amount")
    .in("invoice_id", (allOpenInvoices || []).map((i) => i.id));

  const paidByInvoice = new Map<string, number>();
  for (const p of allPaymentsForOpen || []) {
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) || 0) + Number(p.amount));
  }

  const outstanding = (allOpenInvoices || []).reduce((sum, i) => sum + (Number(i.total) - (paidByInvoice.get(i.id) || 0)), 0);
  const overdueInvoices = (allOpenInvoices || []).filter((i) => i.status === "overdue");
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (Number(i.total) - (paidByInvoice.get(i.id) || 0)), 0);

  const byChannel: Record<string, number> = {};
  for (const p of paymentRows) byChannel[p.channel] = (byChannel[p.channel] || 0) + Number(p.amount);

  const byClient: Record<string, number> = {};
  for (const p of paymentRows) {
    const clientId = p.crm_invoices?.client_id;
    if (clientId) byClient[clientId] = (byClient[clientId] || 0) + Number(p.amount);
  }
  const topClientIds = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const { data: topClients } = topClientIds.length > 0
    ? await supabase.from("crm_clients").select("id, name").in("id", topClientIds.map(([id]) => id))
    : { data: [] };
  const clientNameById = new Map((topClients || []).map((c) => [c.id, c.name]));

  const currency = invoiceRows[0]?.currency || "NGN";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Financial dashboard</h1>
          <p className="text-sm text-muted">Invoiced and collected, sourced from every invoice and recorded payment.</p>
        </div>
        <div className="flex gap-2">
          {[["30d", "30 days"], ["90d", "90 days"], ["all", "All time"]].map(([value, label]) => (
            <Link
              key={value}
              href={`/crm/finance?period=${value}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${period === value ? "bg-accent-blue text-white border-accent-blue" : "border-border text-muted"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-header/20 border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-foreground">{formatMoney(totalInvoiced, currency)}</p>
          <p className="text-xs text-muted">Total invoiced</p>
        </div>
        <div className="bg-header/20 border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-accent-green">{formatMoney(totalCollected, currency)}</p>
          <p className="text-xs text-muted">Total collected</p>
        </div>
        <div className="bg-header/20 border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-foreground">{formatMoney(outstanding, currency)}</p>
          <p className="text-xs text-muted">Outstanding balance</p>
        </div>
        <div className="bg-header/20 border border-border rounded-xl p-3 text-center">
          <p className={`text-lg font-bold ${overdueInvoices.length > 0 ? "text-red-400" : "text-foreground"}`}>{formatMoney(overdueAmount, currency)}</p>
          <p className="text-xs text-muted">Overdue ({overdueInvoices.length})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-header/20 border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Collected by channel</h2>
          {Object.keys(byChannel).length === 0 && <p className="text-sm text-muted">No payments in this period.</p>}
          <div className="flex flex-col gap-2">
            {Object.entries(byChannel).sort((a, b) => b[1] - a[1]).map(([channel, amount]) => (
              <div key={channel} className="flex justify-between text-sm">
                <span className="text-muted">{CHANNEL_LABELS[channel] || channel}</span>
                <span className="text-foreground">{formatMoney(amount, currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-header/20 border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Top clients by revenue</h2>
          {topClientIds.length === 0 && <p className="text-sm text-muted">No payments in this period.</p>}
          <div className="flex flex-col gap-2">
            {topClientIds.map(([clientId, amount]) => (
              <Link key={clientId} href={`/crm/clients/${clientId}`} className="flex justify-between text-sm hover:text-accent-blue">
                <span className="text-foreground">{clientNameById.get(clientId) || "—"}</span>
                <span className="text-muted">{formatMoney(amount, currency)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
