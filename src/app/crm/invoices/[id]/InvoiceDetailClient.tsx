"use client";

import { useState } from "react";
import { Loader2, Send, Download, Ban, Plus, FileText } from "lucide-react";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmInvoice, CrmInvoicePayment } from "@/lib/crm/types";
import { sendInvoice, recordPayment, voidInvoice, getReceiptSignedUrl } from "../actions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted/20 text-muted",
  sent: "bg-accent-blue/15 text-accent-blue",
  viewed: "bg-accent-blue/15 text-accent-blue",
  partially_paid: "bg-yellow-400/15 text-yellow-400",
  paid: "bg-accent-green/15 text-accent-green",
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

function PaymentForm({ invoiceId, onDone, onCancel }: { invoiceId: string; onDone: () => void; onCancel: () => void }) {
  const { toast } = useCrmFeedback();
  const [loading, setLoading] = useState(false);

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
          <input id="amount" name="amount" type="number" min="0" step="0.01" required className={crmInputClass} />
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
}: {
  invoice: CrmInvoice;
  client: { id: string; name: string; email: string | null; company: string | null } | null;
  payments: CrmInvoicePayment[];
}) {
  const { toast, confirm } = useCrmFeedback();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = invoice.total - totalPaid;

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
          {invoice.status !== "void" && (
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
                  <td className="py-2 text-right">{item.unit_price.toFixed(2)}</td>
                  <td className="py-2 text-right">{(item.qty * item.unit_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-3">
          <div className="w-56 flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted"><span>Subtotal</span><span>{invoice.subtotal.toFixed(2)}</span></div>
            {invoice.tax_rate > 0 && <div className="flex justify-between text-muted"><span>Tax ({invoice.tax_rate}%)</span><span>{invoice.tax_amount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1"><span>Total</span><span>{invoice.currency} {invoice.total.toFixed(2)}</span></div>
            <div className="flex justify-between text-accent-green"><span>Paid</span><span>{invoice.currency} {totalPaid.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Balance</span><span>{invoice.currency} {balance.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-header/20 border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Payments</h2>
          <button onClick={() => setPaymentOpen(true)} className="text-accent-blue hover:underline text-sm inline-flex items-center gap-1">
            <Plus size={14} /> Record payment
          </button>
        </div>
        {payments.length === 0 && <p className="text-sm text-muted py-2">No payments recorded yet.</p>}
        <div className="flex flex-col gap-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-foreground">{invoice.currency} {Number(p.amount).toFixed(2)} <span className="text-muted">· {CHANNEL_LABELS[p.channel]}</span></p>
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

      {invoice.status !== "void" && invoice.status !== "paid" && (
        <button onClick={handleVoid} className="text-sm text-red-400 hover:underline self-start inline-flex items-center gap-1">
          <Ban size={14} /> Void this invoice
        </button>
      )}

      <CrmModal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record a payment">
        <PaymentForm invoiceId={invoice.id} onCancel={() => setPaymentOpen(false)} onDone={() => window.location.reload()} />
      </CrmModal>
    </>
  );
}
