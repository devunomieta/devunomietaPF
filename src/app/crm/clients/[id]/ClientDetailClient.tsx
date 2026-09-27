"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { formatMoney } from "@/lib/crm/currency";
import type { CrmClient, CrmContact, CrmStageEvent, CrmInvoice } from "@/lib/crm/types";
import { ClientForm } from "../ClientForm";
import { addContact, deleteContact } from "../actions";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm border-b border-border/50 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-foreground text-right">{value || "—"}</span>
    </div>
  );
}

function ContactModal({ clientId, onDone, onCancel }: { clientId: string; onDone: () => void; onCancel: () => void }) {
  const { toast } = useCrmFeedback();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await addContact(formData, { clientId });
    setLoading(false);
    if ("success" in result) onDone();
    else toast(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className={crmLabelClass} htmlFor="name">Name *</label>
        <input id="name" name="name" required className={crmInputClass} />
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="role">Role</label>
        <input id="role" name="role" className={crmInputClass} placeholder="Finance lead" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="phone">Phone</label>
          <input id="phone" name="phone" className={crmInputClass} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onCancel} className={crmSecondaryBtnClass}>Cancel</button>
        <button type="submit" disabled={loading} className={crmPrimaryBtnClass}>
          {loading && <Loader2 size={15} className="animate-spin" />}
          Add contact
        </button>
      </div>
    </form>
  );
}

export function ClientDetailClient({
  client,
  contacts,
  stageEvents,
  invoices,
}: {
  client: CrmClient;
  contacts: CrmContact[];
  stageEvents: CrmStageEvent[];
  invoices: CrmInvoice[];
}) {
  const { toast, confirm } = useCrmFeedback();
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  async function handleDeleteContact(id: string) {
    if (!(await confirm("Remove this contact?", { danger: true, confirmLabel: "Remove" }))) return;
    const result = await deleteContact(id, { clientId: client.id });
    if ("success" in result) window.location.reload();
    else toast(result.error);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-1 flex flex-col gap-5">
        <div className="bg-header/20 border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Details</h2>
            <button onClick={() => setEditOpen(true)} className="text-muted hover:text-foreground" aria-label="Edit client">
              <Pencil size={14} />
            </button>
          </div>
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Phone" value={client.phone} />
          <InfoRow label="Company" value={client.company} />
          <InfoRow
            label="Status"
            value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${client.status === "active" ? "bg-accent-green/15 text-accent-green" : "bg-muted/20 text-muted"}`}>
                {client.status}
              </span>
            }
          />
          <InfoRow label="Source" value={client.source} />
          <InfoRow label="Tags" value={client.tags?.length ? client.tags.join(", ") : null} />
          {client.notes && <p className="text-sm text-muted mt-3 whitespace-pre-wrap">{client.notes}</p>}
        </div>

        <div className="bg-header/20 border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Contacts</h2>
            <button onClick={() => setContactOpen(true)} className="text-muted hover:text-foreground" aria-label="Add contact">
              <Plus size={15} />
            </button>
          </div>
          {contacts.length === 0 && <p className="text-sm text-muted py-2">No contacts yet.</p>}
          <div className="flex flex-col gap-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-foreground">{c.name}{c.role && <span className="text-muted"> · {c.role}</span>}</p>
                  <p className="text-muted text-xs">{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <button onClick={() => handleDeleteContact(c.id)} className="text-muted hover:text-red-400 shrink-0" aria-label="Remove contact">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-5">
        <div className="bg-header/20 border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Invoices</h2>
          {invoices.length === 0 && <p className="text-sm text-muted py-2">No invoices yet.</p>}
          <div className="flex flex-col gap-2">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/crm/invoices/${inv.id}`}
                className="flex items-center justify-between gap-2 text-sm py-2 px-2 rounded-lg hover:bg-accent-blue/5 border-b border-border/50 last:border-0"
              >
                <span className="text-foreground font-medium">{inv.number}</span>
                <span className="text-muted">{formatMoney(inv.total, inv.currency)}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-blue/15 text-accent-blue">{inv.status}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-header/20 border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Stage history</h2>
          {stageEvents.length === 0 && <p className="text-sm text-muted py-2">No journey activity yet.</p>}
          <div className="flex flex-col gap-3">
            {stageEvents.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-blue mt-1.5 shrink-0" />
                <div>
                  <p className="text-foreground">{ev.stage_key}</p>
                  <p className="text-muted text-xs">{new Date(ev.entered_at).toLocaleString()}{ev.note ? ` · ${ev.note}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CrmModal open={editOpen} onClose={() => setEditOpen(false)} title="Edit client">
        <ClientForm client={client} onCancel={() => setEditOpen(false)} onDone={() => window.location.reload()} />
      </CrmModal>
      <CrmModal open={contactOpen} onClose={() => setContactOpen(false)} title="Add contact">
        <ContactModal clientId={client.id} onCancel={() => setContactOpen(false)} onDone={() => window.location.reload()} />
      </CrmModal>
    </div>
  );
}
