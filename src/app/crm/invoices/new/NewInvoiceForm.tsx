"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { createInvoice } from "../actions";

type LineItem = { description: string; qty: string; unit_price: string };

export function NewInvoiceForm({
  clients,
  defaultClientId,
  defaultCurrency,
  defaultTaxRate,
}: {
  clients: { id: string; name: string; company: string | null }[];
  defaultClientId?: string;
  defaultCurrency: string;
  defaultTaxRate: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: "1", unit_price: "" }]);
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate));
  const [loading, setLoading] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.unit_price) || 0), 0),
    [items]
  );
  const taxAmount = subtotal * ((parseFloat(taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createInvoice(formData);
    setLoading(false);
    if ("success" in result && result.invoiceId) {
      router.push(`/crm/invoices/${result.invoiceId}`);
    } else if ("error" in result) {
      alert(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-header/20 border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-4">
      <div>
        <label className={crmLabelClass} htmlFor="clientId">Client *</label>
        <select id="clientId" name="clientId" required defaultValue={defaultClientId || ""} className={crmInputClass}>
          <option value="" disabled>Select a client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={crmLabelClass}>Line items *</label>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_60px_90px_auto] gap-2 items-center">
              <input
                name="item_description"
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Description"
                className={crmInputClass}
              />
              <input
                name="item_qty"
                type="number"
                min="0"
                step="1"
                value={item.qty}
                onChange={(e) => updateItem(i, { qty: e.target.value })}
                className={crmInputClass}
              />
              <input
                name="item_unit_price"
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price}
                onChange={(e) => updateItem(i, { unit_price: e.target.value })}
                placeholder="Price"
                className={crmInputClass}
              />
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={items.length === 1}
                className="text-muted hover:text-red-400 disabled:opacity-30"
                aria-label="Remove line"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, { description: "", qty: "1", unit_price: "" }])}
          className="text-sm text-accent-blue hover:underline mt-2 inline-flex items-center gap-1"
        >
          <Plus size={14} /> Add line
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="currency">Currency</label>
          <input id="currency" name="currency" defaultValue={defaultCurrency} className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="taxRate">Tax rate (%)</label>
          <input id="taxRate" name="taxRate" type="number" min="0" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="dueDate">Due date</label>
          <input id="dueDate" name="dueDate" type="date" className={crmInputClass} />
        </div>
      </div>

      <div>
        <label className={crmLabelClass} htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={2} className={crmInputClass} />
      </div>

      <div className="flex justify-end">
        <div className="w-56 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-muted"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-muted"><span>Tax</span><span>{taxAmount.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1 mt-1"><span>Total</span><span>{total.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className={crmSecondaryBtnClass}>Cancel</button>
        <button type="submit" disabled={loading} className={crmPrimaryBtnClass}>
          {loading && <Loader2 size={15} className="animate-spin" />}
          Create invoice
        </button>
      </div>
    </form>
  );
}
