"use client";

import { useState } from "react";
import { Loader2, Mail, MessageCircle, StickyNote, Send, Sparkles, User, Tag } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass } from "./CrmModal";
import { useCrmFeedback } from "./CrmFeedbackProvider";
import { composeNewEmail, saveInternalNote } from "@/app/crm/mailbox/actions";
import { sendSingleWhatsApp } from "@/app/crm/whatsapp/actions";
import type { CrmContact, CrmCommunicationTemplate } from "@/lib/crm/types";

interface RecipientOption {
  label: string;
  email: string | null;
  phone: string | null;
  contactId?: string;
  role?: string;
  isPrimary?: boolean;
}

export function CrmQuickActionDock({
  clientId,
  leadId,
  entityName,
  entityEmail,
  entityPhone,
  contacts,
  templates = [],
  onActionComplete,
}: {
  clientId?: string;
  leadId?: string;
  entityName: string;
  entityEmail?: string | null;
  entityPhone?: string | null;
  contacts: CrmContact[];
  templates?: CrmCommunicationTemplate[];
  onActionComplete?: () => void;
}) {
  const { toast } = useCrmFeedback();
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp" | "note">("email");
  const [loading, setLoading] = useState(false);

  // Recipient options builder (collect primary entity email/phone + each contact's primary and additional emails)
  const recipientOptions: RecipientOption[] = [];

  if (entityEmail || entityPhone) {
    recipientOptions.push({
      label: `${entityName} (Primary Account)`,
      email: entityEmail || null,
      phone: entityPhone || null,
      isPrimary: true,
    });
  }

  contacts.forEach((c) => {
    if (c.email || c.phone) {
      recipientOptions.push({
        label: `${c.name}${c.role ? ` · ${c.role}` : ""}`,
        email: c.email || null,
        phone: c.phone || null,
        contactId: c.id,
        role: c.role || undefined,
      });
    }

    if (c.additional_emails && c.additional_emails.length > 0) {
      c.additional_emails.forEach((secEmail) => {
        recipientOptions.push({
          label: `${c.name} (Alt: ${secEmail})`,
          email: secEmail,
          phone: c.phone || null,
          contactId: c.id,
          role: c.role || undefined,
        });
      });
    }
  });

  // Selected recipient index
  const [selectedRecipientIdx, setSelectedRecipientIdx] = useState(0);
  const currentRecipient = recipientOptions[selectedRecipientIdx] || recipientOptions[0];

  // Email form state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // WhatsApp form state
  const [waPhone, setWaPhone] = useState(currentRecipient?.phone || entityPhone || "");
  const [waMessage, setWaMessage] = useState("");

  // Internal Note state
  const [noteContent, setNoteContent] = useState("");

  // Helper to interpolate merge variables
  const interpolateTemplate = (text: string) => {
    const contactName = currentRecipient?.label.split(" (")[0] || entityName;
    const firstName = contactName.split(" ")[0] || contactName;

    return text
      .replace(/\{\{client_name\}\}/gi, entityName)
      .replace(/\{\{lead_name\}\}/gi, entityName)
      .replace(/\{\{company\}\}/gi, entityName)
      .replace(/\{\{contact_name\}\}/gi, contactName)
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{sender_name\}\}/gi, "Portfolio Admin")
      .replace(/\{\{current_date\}\}/gi, new Date().toLocaleDateString());
  };

  const handleSelectTemplate = (template: CrmCommunicationTemplate) => {
    if (activeTab === "email") {
      if (template.subject) {
        setEmailSubject(interpolateTemplate(template.subject));
      }
      setEmailBody(interpolateTemplate(template.body));
    } else if (activeTab === "whatsapp") {
      setWaMessage(interpolateTemplate(template.body));
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecipient?.email) {
      toast("No email address available for the selected recipient.");
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast("Subject and email body are required.");
      return;
    }

    setLoading(true);
    const html = `<p>${emailBody.replace(/\n/g, "<br/>")}</p>`;
    const res = await composeNewEmail({
      toEmail: currentRecipient.email,
      toName: currentRecipient.label.split(" (")[0],
      subject: emailSubject,
      messageText: emailBody,
      messageHtml: html,
      clientId,
      leadId,
      contactId: currentRecipient.contactId,
    });
    setLoading(false);

    if ("success" in res && res.success) {
      toast("Email sent successfully!");
      setEmailSubject("");
      setEmailBody("");
      onActionComplete?.();
    } else {
      toast(("error" in res && res.error) ? res.error : "Failed to send email");
    }
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = waPhone || currentRecipient?.phone;
    if (!phone) {
      toast("Please provide a recipient phone number.");
      return;
    }
    if (!waMessage.trim()) {
      toast("WhatsApp message cannot be empty.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("phone", phone);
    formData.set("message", waMessage);
    if (clientId) formData.set("clientId", clientId);
    if (leadId) formData.set("leadId", leadId);

    const res = await sendSingleWhatsApp(formData);
    setLoading(false);

    if ("success" in res && res.success) {
      toast("WhatsApp message sent successfully!");
      setWaMessage("");
      onActionComplete?.();
    } else {
      toast(("error" in res && res.error) ? res.error : "Failed to send WhatsApp message");
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      toast("Note content cannot be empty.");
      return;
    }

    setLoading(true);
    const res = await saveInternalNote({
      clientId,
      leadId,
      content: noteContent,
    });
    setLoading(false);

    if ("success" in res && res.success) {
      toast("Internal team note added!");
      setNoteContent("");
      onActionComplete?.();
    } else {
      toast(("error" in res && res.error) ? res.error : "Failed to save note");
    }
  };

  // Filter templates relevant to active tab
  const relevantTemplates = templates.filter(
    (t) => t.channel === "all" || t.channel === activeTab
  );

  return (
    <div className="bg-gradient-to-b from-header/40 to-header/20 border border-border/80 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
      {/* Navigation tabs */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-border/60 bg-header/30 gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-background/60 border border-border/60 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              activeTab === "email"
                ? "bg-accent-blue text-white shadow-sm ring-1 ring-accent-blue/40"
                : "text-muted hover:text-foreground hover:bg-header/40"
            }`}
          >
            <Mail size={13} /> Email
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("whatsapp");
              if (!waPhone && currentRecipient?.phone) {
                setWaPhone(currentRecipient.phone);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              activeTab === "whatsapp"
                ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/40"
                : "text-muted hover:text-foreground hover:bg-header/40"
            }`}
          >
            <MessageCircle size={13} /> WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("note")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              activeTab === "note"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/20 shadow-sm"
                : "text-muted hover:text-foreground hover:bg-header/40"
            }`}
          >
            <StickyNote size={13} /> Internal Note
          </button>
        </div>

        {/* Canned snippet shortcuts dropdown */}
        {relevantTemplates.length > 0 && activeTab !== "note" && (
          <div className="relative group">
            <button
              type="button"
              className="text-xs font-medium text-foreground/80 hover:text-foreground flex items-center gap-1.5 bg-background/60 hover:bg-header/60 border border-border/70 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>Canned Snippets</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-background border border-border rounded-xl shadow-2xl p-2 hidden group-hover:block z-30 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2 py-1 border-b border-border/40 mb-1">
                Insert Snippet
              </div>
              <div className="space-y-1">
                {relevantTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t)}
                    className="w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-accent-blue/10 hover:text-accent-blue transition-colors flex items-center justify-between group/btn"
                  >
                    <span className="font-medium truncate group-hover/btn:text-foreground">{t.title}</span>
                    <span className="text-[10px] text-muted font-mono bg-header/40 px-1.5 py-0.5 rounded border border-border/40">
                      {t.shortcut}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Recipient Picker (for Email and WhatsApp) */}
        {activeTab !== "note" && recipientOptions.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted font-medium flex items-center gap-1">
              <User size={12} /> To:
            </span>
            <select
              value={selectedRecipientIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSelectedRecipientIdx(idx);
                const r = recipientOptions[idx];
                if (r?.phone) setWaPhone(r.phone);
              }}
              className="bg-header/40 border border-border/80 rounded-lg px-2.5 py-1 text-xs text-foreground focus:border-accent-blue outline-none max-w-xs truncate"
            >
              {recipientOptions.map((opt, i) => (
                <option key={i} value={i} className="bg-background text-foreground">
                  {opt.label} — {activeTab === "email" ? (opt.email || "No email") : (opt.phone || "No phone")}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab 1: Email Composer */}
        {activeTab === "email" && (
          <form onSubmit={handleSendEmail} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Subject..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
                className={crmInputClass}
              />
            </div>
            <div>
              <textarea
                placeholder="Type your email message or pick a snippet above..."
                rows={4}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                required
                className={`${crmInputClass} resize-y min-h-[90px]`}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted">
                Sent from portfolio admin mail with automatic RFC-compliant threading.
              </span>
              <button
                type="submit"
                disabled={loading || !currentRecipient?.email}
                className={crmPrimaryBtnClass}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Send
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: WhatsApp Sender */}
        {activeTab === "whatsapp" && (
          <form onSubmit={handleSendWhatsApp} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Recipient Phone (+1234567890)"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                required
                className={crmInputClass}
              />
            </div>
            <div>
              <textarea
                placeholder="Type WhatsApp message..."
                rows={3}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                required
                className={`${crmInputClass} resize-y`}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted">Direct 1:1 message sent via Green API.</span>
              <button
                type="submit"
                disabled={loading || !waPhone}
                className="px-4 py-2 bg-accent-green text-white rounded-lg hover:bg-accent-green/80 transition-all text-sm flex items-center gap-2"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Send WhatsApp
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Internal Collaboration Note */}
        {activeTab === "note" && (
          <form onSubmit={handleSaveNote} className="space-y-3">
            <div>
              <textarea
                placeholder="Add a private note about a phone call, contract nuance, or task for teammates (visible only to CRM users)..."
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                required
                className={`${crmInputClass} border-amber-500/30 focus:border-amber-400 bg-amber-500/5`}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-amber-400/80">
                🔒 Private internal note. Not sent to the customer.
              </span>
              <button
                type="submit"
                disabled={loading || !noteContent.trim()}
                className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg hover:bg-amber-500/30 transition-all text-sm flex items-center gap-2"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <StickyNote size={13} />}
                Save Team Note
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
