"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmSettings } from "@/lib/crm/types";
import { saveSettings, checkWhatsAppConnection } from "./actions";

export function SettingsForm({ settings, whatsappConfigured }: { settings: CrmSettings; whatsappConfigured: boolean }) {
  const { toast } = useCrmFeedback();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connectionState, setConnectionState] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await saveSettings(formData);
    setLoading(false);
    if ("success" in result) window.location.reload();
    else toast(result.error);
  }

  async function handleCheckConnection() {
    setChecking(true);
    const result = await checkWhatsAppConnection();
    setChecking(false);
    setConnectionState("state" in result ? result.state : `Error: ${result.error}`);
  }

  return (
    <>
      <div className="bg-header/20 border border-border rounded-xl p-4 sm:p-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1">WhatsApp (GREEN-API)</h2>
          <p className="text-sm text-muted flex items-center gap-1.5">
            {whatsappConfigured ? <CheckCircle2 size={14} className="text-accent-green" /> : <XCircle size={14} className="text-red-400" />}
            {whatsappConfigured ? "Environment variables set" : "Not configured — see docs/CRM_SETUP.md"}
          </p>
          {connectionState && <p className="text-xs text-muted mt-1">Instance state: {connectionState}</p>}
        </div>
        {whatsappConfigured && (
          <button type="button" onClick={handleCheckConnection} disabled={checking} className={crmPrimaryBtnClass}>
            {checking && <Loader2 size={14} className="animate-spin" />}
            Check connection
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-header/20 border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Invoice branding</h2>
        <input type="hidden" name="existingLogoUrl" value={settings?.logo_url || ""} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={crmLabelClass} htmlFor="business_name">Business name</label>
            <input id="business_name" name="business_name" defaultValue={settings?.business_name || ""} className={crmInputClass} />
          </div>
          <div>
            <label className={crmLabelClass} htmlFor="business_email">Business email</label>
            <input id="business_email" name="business_email" type="email" defaultValue={settings?.business_email || ""} className={crmInputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={crmLabelClass} htmlFor="business_phone">Business phone</label>
            <input id="business_phone" name="business_phone" defaultValue={settings?.business_phone || ""} className={crmInputClass} />
          </div>
          <div>
            <label className={crmLabelClass} htmlFor="brand_color">Brand color</label>
            <input id="brand_color" name="brand_color" type="color" defaultValue={settings?.brand_color || "#58a6ff"} className={`${crmInputClass} h-10`} />
          </div>
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="business_address">Business address</label>
          <textarea id="business_address" name="business_address" rows={2} defaultValue={settings?.business_address || ""} className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="logo">Logo {settings?.logo_url && <span className="text-muted normal-case">(uploading replaces the current one)</span>}</label>
          {settings?.logo_url && <img src={settings.logo_url} alt="Current logo" className="h-12 mb-2 object-contain" />}
          <input id="logo" name="logo" type="file" accept="image/*" className={crmInputClass} />
        </div>
        <div>
          <label className={crmLabelClass} htmlFor="invoice_footer_note">Invoice footer note</label>
          <input id="invoice_footer_note" name="invoice_footer_note" defaultValue={settings?.invoice_footer_note || ""} className={crmInputClass} placeholder="Thank you for your business!" />
        </div>

        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mt-2">Invoicing defaults</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={crmLabelClass} htmlFor="invoice_prefix">Number prefix</label>
            <input id="invoice_prefix" name="invoice_prefix" defaultValue={settings?.invoice_prefix || "INV"} className={crmInputClass} />
          </div>
          <div>
            <label className={crmLabelClass} htmlFor="default_currency">Default currency</label>
            <input id="default_currency" name="default_currency" defaultValue={settings?.default_currency || "NGN"} className={crmInputClass} />
          </div>
          <div>
            <label className={crmLabelClass} htmlFor="default_tax_rate">Default tax rate (%)</label>
            <input id="default_tax_rate" name="default_tax_rate" type="number" step="0.01" defaultValue={settings?.default_tax_rate ?? 0} className={crmInputClass} />
          </div>
        </div>

        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mt-2">Email sending limits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={crmLabelClass} htmlFor="brevo_daily_cap">Daily send cap</label>
            <input id="brevo_daily_cap" name="brevo_daily_cap" type="number" defaultValue={settings?.brevo_daily_cap ?? 300} className={crmInputClass} />
            <p className="text-xs text-muted mt-1">Match your Brevo plan&apos;s daily limit.</p>
          </div>
          <div>
            <label className={crmLabelClass} htmlFor="bounce_alert_threshold">Bounce alert (%)</label>
            <input id="bounce_alert_threshold" name="bounce_alert_threshold" type="number" step="0.1" defaultValue={settings?.bounce_alert_threshold ?? 5} className={crmInputClass} />
          </div>
          <div>
            <label className={crmLabelClass} htmlFor="complaint_alert_threshold">Complaint alert (%)</label>
            <input id="complaint_alert_threshold" name="complaint_alert_threshold" type="number" step="0.01" defaultValue={settings?.complaint_alert_threshold ?? 0.1} className={crmInputClass} />
          </div>
        </div>

        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mt-2">Automated Monthly Reports</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className={crmLabelClass} htmlFor="report_notification_emails">
              Report recipient emails (comma separated)
            </label>
            <input
              id="report_notification_emails"
              name="report_notification_emails"
              type="text"
              defaultValue={(settings?.report_notification_emails || []).join(", ")}
              className={crmInputClass}
              placeholder="admin@yourbusiness.com, partner@yourbusiness.com"
            />
            <p className="text-xs text-muted mt-1">
              The monthly Executive summary report PDF will be automatically emailed to these addresses on the 1st of each month.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={crmLabelClass} htmlFor="report_default_due_days">
                Default Net Terms (Days)
              </label>
              <input
                id="report_default_due_days"
                name="report_default_due_days"
                type="number"
                min="1"
                max="90"
                defaultValue={settings?.report_default_due_days ?? 14}
                className={crmInputClass}
              />
              <p className="text-xs text-muted mt-1">
                Used to calculate overdue status & aging buckets when an invoice has no explicit due date.
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer mt-4 sm:mt-2">
                <input
                  type="checkbox"
                  name="report_auto_send"
                  defaultChecked={settings?.report_auto_send ?? true}
                  className="rounded border-border text-accent-blue focus:ring-accent-blue h-4 w-4 bg-header"
                />
                <span className="text-sm font-medium text-foreground">
                  Enable automated monthly email dispatch
                </span>
              </label>
              <p className="text-xs text-muted ml-6">
                Fires on the 1st day of every month at 07:00 UTC.
              </p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className={`${crmPrimaryBtnClass} self-start mt-2`}>
          {loading && <Loader2 size={15} className="animate-spin" />}
          Save settings
        </button>
      </form>
    </>
  );
}
