"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { formatMoney } from "@/lib/crm/currency";
import type { CrmClient, CrmContact, CrmStageEvent, CrmInvoice, CrmThread, CrmInternalNote, CrmCommunicationTemplate } from "@/lib/crm/types";
import { ClientForm } from "../ClientForm";
import { addContact, deleteContact } from "../actions";
import { CrmPhoneBadge } from "@/components/crm/CrmPhoneBadge";
import { CrmQuickActionDock } from "@/components/crm/CrmQuickActionDock";
import { CrmActivityTimeline } from "@/components/crm/CrmActivityTimeline";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2 px-1 text-sm border-b border-border/40 min-w-0">
      <span className="text-[11px] font-medium text-muted uppercase tracking-wider">{label}</span>
      <div className="text-foreground text-sm font-medium break-all whitespace-normal">
        {value || <span className="text-muted/60 font-normal">—</span>}
      </div>
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
        <input id="name" name="name" required className={crmInputClass} placeholder="e.g. Sarah Chen" />
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="role">Role / Department</label>
        <input id="role" name="role" className={crmInputClass} placeholder="e.g. Finance Lead, Technical Director" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={crmLabelClass} htmlFor="email">Primary Email</label>
          <input id="email" name="email" type="email" className={crmInputClass} placeholder="sarah@company.com" />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="phone">Phone / WhatsApp</label>
          <input id="phone" name="phone" className={crmInputClass} placeholder="+1234567890" />
        </div>
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="additional_emails">Additional / Secondary Emails (comma-separated)</label>
        <input
          id="additional_emails"
          name="additional_emails"
          className={crmInputClass}
          placeholder="billing@company.com, sarah.personal@gmail.com"
        />
        <p className="text-[11px] text-muted mt-1">Replies received from any of these addresses will automatically link to this client.</p>
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
  threads = [],
  internalNotes = [],
  templates = [],
  whatsAppEvents = [],
}: {
  client: CrmClient;
  contacts: CrmContact[];
  stageEvents: CrmStageEvent[];
  invoices: CrmInvoice[];
  threads?: CrmThread[];
  internalNotes?: CrmInternalNote[];
  templates?: CrmCommunicationTemplate[];
  whatsAppEvents?: Array<{
    id: string;
    phone: string;
    message: string | null;
    status: string;
    direction: string;
    created_at: string;
  }>;
}) {
  const { toast, confirm, canPerform } = useCrmFeedback();
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const canEditClient = canPerform("clients_edit");

  async function handleDeleteContact(id: string) {
    if (!canEditClient) {
      toast("You don't have permission to modify client contacts.");
      return;
    }
    if (!(await confirm("Remove this contact?", { danger: true, confirmLabel: "Remove" }))) return;
    const result = await deleteContact(id, { clientId: client.id });
    if ("success" in result) window.location.reload();
    else toast(result.error);
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Contact Info & Client Profile Block (with Integrated Contacts) */}
      <div className="bg-header/20 border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Client Profile & Contact Info</h2>
          {canEditClient && (
            <button
              onClick={() => setEditOpen(true)}
              className="text-muted hover:text-accent-blue inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
              aria-label="Edit client"
            >
              <Pencil size={13} />
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-1">
          <InfoRow label="Email" value={client.email ? <a href={`mailto:${client.email}`} className="text-accent-blue hover:underline">{client.email}</a> : null} />
          <InfoRow label="Phone" value={<CrmPhoneBadge phone={client.phone} onEditClick={() => setEditOpen(true)} />} />
          <InfoRow label="Company" value={client.company} />
          <InfoRow label="Location" value={client.location} />
          <InfoRow
            label="Website"
            value={
              client.website ? (
                <a
                  href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-blue hover:underline"
                >
                  {client.website.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              ) : null
            }
          />
          <InfoRow
            label="Status"
            value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${client.status === "active" ? "bg-accent-green/15 text-accent-green" : "bg-muted/20 text-muted"}`}>
                {client.status}
              </span>
            }
          />
          <InfoRow label="Source" value={client.source} />
        </div>

        {client.tags?.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted mr-1">Tags:</span>
            {client.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-md text-xs font-medium bg-border/40 text-foreground/80">
                {t}
              </span>
            ))}
          </div>
        )}

        {client.notes && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">Internal Notes</span>
            <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
          </div>
        )}

        {/* Embedded Contacts Sub-section */}
        <div className="mt-5 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Associated Contacts</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-border/40 text-muted">
                {contacts.length}
              </span>
            </div>
            {canEditClient && (
              <button
                onClick={() => setContactOpen(true)}
                className="text-accent-blue hover:text-accent-blue/80 inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                aria-label="Add contact"
              >
                <Plus size={14} />
                Add Contact
              </button>
            )}
          </div>

          {contacts.length === 0 ? (
            <p className="text-xs text-muted py-1 italic">No extra contacts linked to this client yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-border/60 bg-header/10 hover:border-accent-blue/30 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {c.name}
                        {c.role && <span className="text-muted text-[11px] font-normal ml-1.5">({c.role})</span>}
                      </p>
                      <p className="text-muted text-[11px] mt-0.5 truncate">
                        {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {c.additional_emails && c.additional_emails.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {c.additional_emails.map((secEmail, secIdx) => (
                            <span
                              key={secIdx}
                              className="px-1.5 py-0.2 rounded text-[10px] bg-border/40 text-muted border border-border/60"
                            >
                              {secEmail}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {canEditClient && (
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="text-muted hover:text-red-400 p-1 rounded transition-colors -mr-1 -mt-1"
                        aria-label="Remove contact"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Problem and Proposed Solution Block */}
      {(client.pain_points || client.proposed_solution) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {client.pain_points && (
            <div className="bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/20 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">Identified Problems / Pain Points</h2>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{client.pain_points}</p>
            </div>
          )}

          {client.proposed_solution && (
            <div className="bg-gradient-to-br from-accent-green/5 to-transparent border border-accent-green/20 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-2 h-2 rounded-full bg-accent-green" />
                <h2 className="text-xs font-bold text-accent-green uppercase tracking-wider">Proposed Solution / Value Prop</h2>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{client.proposed_solution}</p>
            </div>
          )}
        </div>
      )}

      {/* 3. The Unified Comms Quick Action Block */}
      <CrmQuickActionDock
        clientId={client.id}
        entityName={client.name}
        entityEmail={client.email}
        entityPhone={client.phone}
        contacts={contacts}
        templates={templates}
        onActionComplete={() => window.location.reload()}
      />

      {/* 4. Unified Activities Section (Comms History & Stage Transitions with Pagination) */}
      <CrmActivityTimeline
        threads={threads}
        internalNotes={internalNotes}
        whatsAppEvents={whatsAppEvents}
        stageEvents={stageEvents}
        onRefresh={() => window.location.reload()}
      />

      {/* 5. Invoices Section */}
      <div className="bg-header/20 border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Invoices</h2>
          <Link href={`/crm/invoices/new?clientId=${client.id}`} className="text-xs text-accent-blue hover:underline">
            + New invoice
          </Link>
        </div>
        {invoices.length === 0 ? (
          <p className="text-xs text-muted py-2">No invoices billed to this client yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/crm/invoices/${inv.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent-blue/5 hover:border-accent-blue/30 transition-all"
              >
                <span className="text-sm text-foreground font-medium">{inv.number}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted font-medium">{formatMoney(inv.total, inv.currency)}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-blue/15 text-accent-blue capitalize">
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
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
