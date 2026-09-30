"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Trash2, Loader2, ArrowRightCircle, Mail, MessageCircle } from "lucide-react";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmLead, CrmContact, CrmStageEvent, CrmJourneyStage, CrmThread, CrmInternalNote, CrmCommunicationTemplate } from "@/lib/crm/types";
import { LeadForm } from "../LeadForm";
import { moveLeadStage, convertLeadToClient } from "../actions";
import { addContact, deleteContact } from "../../clients/actions";
import { CrmPhoneBadge } from "@/components/crm/CrmPhoneBadge";
import { CrmTooltip } from "@/components/crm/CrmTooltip";
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

function ContactModal({ leadId, onDone, onCancel }: { leadId: string; onDone: () => void; onCancel: () => void }) {
  const { toast } = useCrmFeedback();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await addContact(formData, { leadId });
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
        <input id="role" name="role" className={crmInputClass} placeholder="e.g. Technical Decision Maker" />
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
          placeholder="sarah.alt@company.com, tech@company.com"
        />
        <p className="text-[11px] text-muted mt-1">Replies received from any of these addresses will automatically link to this lead.</p>
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

export function LeadDetailClient({
  lead,
  contacts,
  stageEvents,
  stages,
  threads = [],
  internalNotes = [],
  templates = [],
  whatsAppEvents = [],
}: {
  lead: CrmLead;
  contacts: CrmContact[];
  stageEvents: CrmStageEvent[];
  stages: CrmJourneyStage[];
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
  const router = useRouter();
  const { toast, confirm, canPerform } = useCrmFeedback();
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const [converting, setConverting] = useState(false);

  const canEditLead = canPerform("leads_edit");

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  async function handleMoveStage(stageKey: string) {
    if (!canEditLead) {
      toast("You don't have permission to move or edit leads.");
      return;
    }
    setMovingStage(true);
    const result = await moveLeadStage(lead.id, stageKey);
    setMovingStage(false);
    if ("success" in result) {
      if (result.clientId) {
        router.push(`/crm/clients/${result.clientId}`);
      } else {
        window.location.reload();
      }
    } else {
      toast(result.error);
    }
  }

  async function handleConvert() {
    if (!canEditLead) {
      toast("You don't have permission to convert leads.");
      return;
    }
    if (!(await confirm("Convert this lead into a client now?", { confirmLabel: "Convert" }))) return;
    setConverting(true);
    const result = await convertLeadToClient(lead.id);
    setConverting(false);
    if ("success" in result && result.clientId) {
      router.push(`/crm/clients/${result.clientId}`);
    } else if ("error" in result) {
      toast(result.error);
    }
  }

  async function handleDeleteContact(id: string) {
    if (!canEditLead) {
      toast("You don't have permission to modify lead contacts.");
      return;
    }
    if (!(await confirm("Remove this contact?", { danger: true, confirmLabel: "Remove" }))) return;
    const result = await deleteContact(id, { leadId: lead.id });
    if ("success" in result) window.location.reload();
    else toast(result.error);
  }

  return (
    <>
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-start gap-2.5 -mt-2">
        <Link
          href={`/crm/campaigns/new?leadId=${lead.id}`}
          className="px-3.5 py-2 border border-border rounded-lg hover:bg-header/50 transition-all text-sm inline-flex items-center gap-1.5 text-foreground"
          id="btn-lead-direct-email"
        >
          <Mail size={14} /> Email
        </Link>
        <Link
          href={`/crm/whatsapp?leadId=${lead.id}`}
          className="px-3.5 py-2 border border-border rounded-lg hover:bg-header/50 transition-all text-sm inline-flex items-center gap-1.5 text-foreground"
          id="btn-lead-direct-whatsapp"
        >
          <MessageCircle size={14} /> WhatsApp
        </Link>

        {canEditLead && lead.status === "open" && !lead.converted_to_client_id && (
          <div className="inline-flex items-center gap-1.5">
            <button onClick={handleConvert} disabled={converting} className={crmPrimaryBtnClass}>
              {converting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightCircle size={15} />}
              Convert to client
            </button>
            <CrmTooltip text="Promotes this lead into an active Client record. Preserves all history, notes, and contacts." />
          </div>
        )}
      </div>

      {sortedStages.length > 0 && lead.status === "open" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {sortedStages.map((s) => (
            <button
              key={s.key}
              disabled={movingStage || s.key === lead.current_stage_key || !canEditLead}
              onClick={() => handleMoveStage(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:cursor-default ${
                s.key === lead.current_stage_key
                  ? "bg-accent-blue text-white border-accent-blue"
                  : !canEditLead
                  ? "border-border/40 text-muted/50 cursor-not-allowed"
                  : "border-border text-muted hover:text-foreground hover:border-accent-blue"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Full-Width Content Container */}
      <div className="flex flex-col gap-6 w-full mt-6">
        {/* 1. Lead Profile & Contact Info Block (with Integrated Contacts) */}
        <div className="bg-header/20 border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Lead Profile & Contact Info</h2>
            {canEditLead && (
              <button
                onClick={() => setEditOpen(true)}
                className="text-muted hover:text-accent-blue inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                aria-label="Edit lead"
              >
                <Pencil size={13} />
                Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-1">
            <InfoRow label="Email" value={lead.email ? <a href={`mailto:${lead.email}`} className="text-accent-blue hover:underline">{lead.email}</a> : null} />
            <InfoRow label="Phone" value={<CrmPhoneBadge phone={lead.phone} onEditClick={() => setEditOpen(true)} />} />
            <InfoRow label="Company" value={lead.company} />
            <InfoRow label="Location" value={lead.location} />
            <InfoRow
              label="Website"
              value={
                lead.website ? (
                  <a
                    href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-blue hover:underline"
                  >
                    {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                ) : null
              }
            />
            <InfoRow label="Lead Score" value={<span className="font-semibold text-accent-blue">{lead.score} / 100</span>} />
            <InfoRow label="Source" value={lead.source} />
            <InfoRow label="Status" value={<span className="capitalize">{lead.status}</span>} />
          </div>

          {lead.tags?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted mr-1">Tags:</span>
              {lead.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-md text-xs font-medium bg-border/40 text-foreground/80">
                  {t}
                </span>
              ))}
            </div>
          )}

          {lead.notes && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">Internal Notes</span>
              <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
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
              {canEditLead && (
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
              <p className="text-xs text-muted py-1 italic">No extra contacts linked to this lead yet.</p>
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
                      {canEditLead && (
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
        {(lead.pain_points || lead.proposed_solution) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lead.pain_points && (
              <div className="bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/20 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">Identified Problems / Pain Points</h2>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{lead.pain_points}</p>
              </div>
            )}

            {lead.proposed_solution && (
              <div className="bg-gradient-to-br from-accent-green/5 to-transparent border border-accent-green/20 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-2 h-2 rounded-full bg-accent-green" />
                  <h2 className="text-xs font-bold text-accent-green uppercase tracking-wider">Proposed Solution / Value Prop</h2>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{lead.proposed_solution}</p>
              </div>
            )}
          </div>
        )}

        {/* 3. The Unified Comms Quick Action Block */}
        <CrmQuickActionDock
          leadId={lead.id}
          entityName={lead.name}
          entityEmail={lead.email}
          entityPhone={lead.phone}
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
      </div>

      <CrmModal open={editOpen} onClose={() => setEditOpen(false)} title="Edit lead">
        <LeadForm lead={lead} onCancel={() => setEditOpen(false)} onDone={() => window.location.reload()} />
      </CrmModal>
      <CrmModal open={contactOpen} onClose={() => setContactOpen(false)} title="Add contact">
        <ContactModal leadId={lead.id} onCancel={() => setContactOpen(false)} onDone={() => window.location.reload()} />
      </CrmModal>
    </>
  );
}
