"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Loader2, ArrowRightCircle } from "lucide-react";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmLead, CrmContact, CrmStageEvent, CrmJourneyStage } from "@/lib/crm/types";
import { LeadForm } from "../LeadForm";
import { moveLeadStage, convertLeadToClient } from "../actions";
import { addContact, deleteContact } from "../../clients/actions";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm border-b border-border/50 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-foreground text-right">{value || "—"}</span>
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
        <input id="name" name="name" required className={crmInputClass} />
      </div>
      <div>
        <label className={crmLabelClass} htmlFor="role">Role</label>
        <input id="role" name="role" className={crmInputClass} />
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

export function LeadDetailClient({
  lead,
  contacts,
  stageEvents,
  stages,
}: {
  lead: CrmLead;
  contacts: CrmContact[];
  stageEvents: CrmStageEvent[];
  stages: CrmJourneyStage[];
}) {
  const router = useRouter();
  const { toast, confirm } = useCrmFeedback();
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const [converting, setConverting] = useState(false);

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  async function handleMoveStage(stageKey: string) {
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
    if (!(await confirm("Remove this contact?", { danger: true, confirmLabel: "Remove" }))) return;
    const result = await deleteContact(id, { leadId: lead.id });
    if ("success" in result) window.location.reload();
    else toast(result.error);
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{lead.name}</h1>
          <p className="text-sm text-muted">{lead.company || "No company"}</p>
        </div>
        {lead.status === "open" && !lead.converted_to_client_id && (
          <button onClick={handleConvert} disabled={converting} className={crmPrimaryBtnClass}>
            {converting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightCircle size={15} />}
            Convert to client
          </button>
        )}
      </div>

      {sortedStages.length > 0 && lead.status === "open" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {sortedStages.map((s) => (
            <button
              key={s.key}
              disabled={movingStage || s.key === lead.current_stage_key}
              onClick={() => handleMoveStage(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:cursor-default ${
                s.key === lead.current_stage_key
                  ? "bg-accent-blue text-white border-accent-blue"
                  : "border-border text-muted hover:text-foreground hover:border-accent-blue"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <div className="lg:col-span-1 flex flex-col gap-5">
          <div className="bg-header/20 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Details</h2>
              <button onClick={() => setEditOpen(true)} className="text-muted hover:text-foreground" aria-label="Edit lead">
                <Pencil size={14} />
              </button>
            </div>
            <InfoRow label="Email" value={lead.email} />
            <InfoRow label="Phone" value={lead.phone} />
            <InfoRow label="Company" value={lead.company} />
            <InfoRow label="Score" value={lead.score} />
            <InfoRow label="Source" value={lead.source} />
            <InfoRow label="Tags" value={lead.tags?.length ? lead.tags.join(", ") : null} />
            {lead.notes && <p className="text-sm text-muted mt-3 whitespace-pre-wrap">{lead.notes}</p>}
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

        <div className="lg:col-span-2">
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
