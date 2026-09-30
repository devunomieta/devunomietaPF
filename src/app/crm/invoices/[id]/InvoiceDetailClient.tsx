"use client";

import { useState } from "react";
import { Loader2, Send, Download, Ban, Plus, FileText, DollarSign, Calculator, Percent } from "lucide-react";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { formatMoney } from "@/lib/crm/currency";
import type { CrmInvoice, CrmInvoicePayment } from "@/lib/crm/types";
import { sendInvoice, recordPayment, voidInvoice, getReceiptSignedUrl, updateInvoiceProfitDeclaration } from "../actions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted/20 text-muted",
  sent: "bg-accent-blue/15 text-accent-blue",
  viewed: "bg-accent-blue/15 text-accent-blue",
  partially_paid: "bg-yellow-400/15 text-yellow-400",
  paid: "bg-accent-green/15 text-accent-green",
  overpaid: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  overdue: "bg-red-400/15 text-red-400",
  void: "bg-muted/20 text-muted line-through",
};

const CHANNEL_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  mobile_money: "Mobile money",
  card: "Card",
  other: "Other",
};

function PaymentForm({
  invoiceId,
  invoiceTotal,
  currentPaid,
  currency,
  onDone,
  onCancel,
}: {
  invoiceId: string;
  invoiceTotal: number;
  currentPaid: number;
  currency: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { toast } = useCrmFeedback();
  const [loading, setLoading] = useState(false);
  const [amountVal, setAmountVal] = useState<string>("");

  const numAmount = parseFloat(amountVal) || 0;
  const isOverpaying = invoiceTotal > 0 && currentPaid + numAmount > invoiceTotal;
  const overpayAmount = Math.max(0, currentPaid + numAmount - invoiceTotal);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("invoiceId", invoiceId);
    const result = await recordPayment(formData);
    setLoading(false);
    if ("success" in result) onDone();
    else toast(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="amount">Amount *</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={amountVal}
            onChange={(e) => setAmountVal(e.target.value)}
            className={crmInputClass}
          />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="channel">Channel *</label>
          <select id="channel" name="channel" required className={crmInputClass}>
            <option value="">Select…</option>
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {isOverpaying && (
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-purple-300 font-medium">
            <span>Overpayment Detected</span>
            <span>+{formatMoney(overpayAmount, currency)} excess</span>
          </div>
          <div>
            <label className={`${crmLabelClass} text-purple-300`} htmlFor="overpaymentReason">
              Reason / Comment for Overpayment *
            </label>
            <input
              id="overpaymentReason"
              name="overpaymentReason"
              required
              placeholder="e.g., Retainer advance, tip, round-up, or client overpaid"
              className={`${crmInputClass} border-purple-500/40 focus:border-purple-400`}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="paidAt">Date paid</label>
          <input id="paidAt" name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="reference">Reference</label>
          <input id="reference" name="reference" className={crmInputClass} placeholder="Transaction ID, note..." />
        </div>
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="receipt">Receipt (optional)</label>
        <input id="receipt" name="receipt" type="file" accept="image/*,.pdf" className={crmInputClass} />
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onCancel} className={crmSecondaryBtnClass}>Cancel</button>
        <button type="submit" disabled={loading} className={crmPrimaryBtnClass}>
          {loading && <Loader2 size={15} className="animate-spin" />}
          Record payment
        </button>
      </div>
    </form>
  );
}

export function InvoiceDetailClient({
  invoice,
  client,
  payments,
  assistants = [],
}: {
  invoice: CrmInvoice;
  client: { id: string; name: string; email: string | null; company: string | null } | null;
  payments: CrmInvoicePayment[];
  assistants?: { id: string; display_name: string; email: string; role_title: string }[];
}) {
  const { toast, confirm, canPerform } = useCrmFeedback();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const canCreateInvoices = canPerform("invoices_create");
  const canDeleteInvoices = canPerform("invoices_delete");

  // Profit declaration form state
  const [coHandledBy, setCoHandledBy] = useState<string>(invoice.co_handled_by || "");
  const [directCost, setDirectCost] = useState<string>(String(invoice.direct_service_cost || "0"));
  const [declaring, setDeclaring] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = invoice.total - totalPaid;

  const costNum = Math.max(0, parseFloat(directCost) || 0);
  const liveNetProfit = Math.max(0, totalPaid - costNum);
  const liveAssistantShare = Number((liveNetProfit * 0.15).toFixed(2));

  async function handleSaveProfitDeclaration(e: React.FormEvent) {
    e.preventDefault();
    setDeclaring(true);
    const res = await updateInvoiceProfitDeclaration(invoice.id, costNum, coHandledBy || null);
    setDeclaring(false);
    if ("success" in res) {
      toast("Declared net profit & 15% assistant profit share updated.", "success");
      window.location.reload();
    } else {
      toast(res.error);
    }
  }

  async function handleSend() {
    setSending(true);
    const result = await sendInvoice(invoice.id);
    setSending(false);
    if ("success" in result) window.location.reload();
    else toast(result.error);
  }

  async function handleVoid() {
    if (!(await confirm("Void this invoice? It will no longer be considered outstanding.", { danger: true, confirmLabel: "Void" }))) return;
    const result = await voidInvoice(invoice.id);
    if ("success" in result) window.location.reload();
    else toast(result.error);
  }

  async function handleViewReceipt(path: string) {
    const result = await getReceiptSignedUrl(path);
    if ("url" in result) window.open(result.url, "_blank");
    else toast(result.error);
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{invoice.number}</h1>
          <p className="text-sm text-muted">{client?.name}{client?.company ? ` — ${client.company}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[invoice.status]}`}>{invoice.status.replace("_", " ")}</span>
          <a href={`/api/crm/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" className={crmSecondaryBtnClass}>
            <Download size={14} className="inline mr-1.5 -mt-0.5" /> PDF
          </a>
          {invoice.status !== "void" && canCreateInvoices && (
            <button onClick={handleSend} disabled={sending} className={crmPrimaryBtnClass}>
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {invoice.status === "draft" ? "Send" : "Resend"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-header/20 border border-border rounded-xl p-4 sm:p-5 mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium text-right">Qty</th>
                <th className="py-2 font-medium text-right">Price</th>
                <th className="py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{item.qty}</td>
                  <td className="py-2 text-right">{formatMoney(item.unit_price, invoice.currency)}</td>
                  <td className="py-2 text-right">{formatMoney(item.qty * item.unit_price, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-3">
          <div className="w-56 flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatMoney(invoice.subtotal, invoice.currency)}</span></div>
            {invoice.tax_rate > 0 && <div className="flex justify-between text-muted"><span>Tax ({invoice.tax_rate}%)</span><span>{formatMoney(invoice.tax_amount, invoice.currency)}</span></div>}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1"><span>Total</span><span>{formatMoney(invoice.total, invoice.currency)}</span></div>
            <div className="flex justify-between text-accent-green"><span>Paid</span><span>{formatMoney(totalPaid, invoice.currency)}</span></div>
            {balance < 0 ? (
              <div className="flex justify-between font-semibold text-purple-400">
                <span>Overpay</span>
                <span>+{formatMoney(Math.abs(balance), invoice.currency)}</span>
              </div>
            ) : (
              <div className="flex justify-between font-semibold">
                <span>Balance</span>
                <span>{formatMoney(balance, invoice.currency)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-header/20 border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Payments</h2>
          {canCreateInvoices && (
            <button onClick={() => setPaymentOpen(true)} className="text-accent-blue hover:underline text-sm inline-flex items-center gap-1">
              <Plus size={14} /> Record payment
            </button>
          )}
        </div>
        {payments.length === 0 && <p className="text-sm text-muted py-2">No payments recorded yet.</p>}
        <div className="flex flex-col gap-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-foreground">{formatMoney(Number(p.amount), invoice.currency)} <span className="text-muted">· {CHANNEL_LABELS[p.channel]}</span></p>
                <p className="text-xs text-muted">{new Date(p.paid_at).toLocaleDateString()}{p.reference ? ` · ${p.reference}` : ""}</p>
              </div>
              {p.receipt_url && (
                <button onClick={() => handleViewReceipt(p.receipt_url!)} className="text-muted hover:text-accent-blue shrink-0" aria-label="View receipt">
                  <FileText size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 15% Net Profit Sharing & Service Delivery Declaration Card */}
      <div className="bg-header/20 border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <Percent size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              15% Net Profit Share &amp; Service Delivery
            </h2>
            <p className="text-xs text-muted">
              Calculates 15% profit for the co-handling assistant based on declared net profit upon delivery.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfitDeclaration} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={crmLabelClass} htmlFor="coHandledBy">
                Co-Handling Assistant
              </label>
              <select
                id="coHandledBy"
                value={coHandledBy}
                onChange={(e) => setCoHandledBy(e.target.value)}
                className={crmInputClass}
              >
                <option value="">None / Handled by Principal Alone</option>
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.display_name} ({a.role_title})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={crmLabelClass} htmlFor="directCost">
                Direct Service Delivery Costs ({invoice.currency})
              </label>
              <input
                id="directCost"
                type="number"
                min="0"
                step="0.01"
                value={directCost}
                onChange={(e) => setDirectCost(e.target.value)}
                placeholder="Software, APIs, hosting, subcontractors..."
                className={crmInputClass}
              />
              <p className="text-[10px] text-muted mt-1">
                Deducted from gross revenue before profit calculation.
              </p>
            </div>
          </div>

          {/* Real-time Calculation Summary */}
          <div className="p-3.5 bg-background/50 border border-border/80 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted block text-[11px]">Total Paid Revenue</span>
              <span className="font-semibold text-foreground">
                {formatMoney(totalPaid, invoice.currency)}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[11px]">- Direct Delivery Cost</span>
              <span className="font-semibold text-red-400">
                {formatMoney(costNum, invoice.currency)}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[11px]">= Declared Net Profit</span>
              <span className="font-semibold text-emerald-500">
                {formatMoney(liveNetProfit, invoice.currency)}
              </span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
              <span className="text-emerald-600 dark:text-emerald-400 block text-[11px] font-bold">
                15% Assistant Share
              </span>
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {formatMoney(liveAssistantShare, invoice.currency)}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={declaring}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {declaring && <Loader2 size={13} className="animate-spin" />}
              Save Profit Declaration
            </button>
          </div>
        </form>
      </div>

      {invoice.status !== "void" && invoice.status !== "paid" && invoice.status !== "overpaid" && canDeleteInvoices && (
        <button onClick={handleVoid} className="text-sm text-red-400 hover:underline self-start inline-flex items-center gap-1">
          <Ban size={14} /> Void this invoice
        </button>
      )}

      <CrmModal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record a payment">
        <PaymentForm
          invoiceId={invoice.id}
          invoiceTotal={invoice.total}
          currentPaid={totalPaid}
          currency={invoice.currency}
          onCancel={() => setPaymentOpen(false)}
          onDone={() => window.location.reload()}
        />
      </CrmModal>
    </>
  );
}
