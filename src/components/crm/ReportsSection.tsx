"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Send,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { sendTestReportAction } from "@/app/crm/monitoring/actions";
import type { ReportCadence } from "@/lib/crm/reports/data";

const MODULES = [
  { key: "executive", label: "Executive Summary (ALL)" },
  { key: "clients", label: "Clients Directory & Accounts" },
  { key: "leads", label: "Sales Leads & Pipeline" },
  { key: "invoices", label: "Invoices, Receivables & Aging" },
];

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function ReportsSection({
  configuredEmails = [],
}: {
  configuredEmails: string[];
}) {
  const { toast } = useCrmFeedback();
  const now = new Date();

  // Default to previous month if currently on 1st/early, or current month
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [selectedModule, setSelectedModule] = useState("executive");
  const [cadence, setCadence] = useState<ReportCadence>("monthly");
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  const [sending, setSending] = useState(false);

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  async function handleSendEmail() {
    setSending(true);
    const result = await sendTestReportAction({
      cadence,
      year,
      month: cadence === "monthly" ? month : undefined,
    });
    setSending(false);

    if ("success" in result) {
      toast(`Executive report successfully emailed to ${result.recipientCount} recipient(s).`);
    } else {
      toast(result.error);
    }
  }

  function getDownloadUrl(format: "pdf" | "csv") {
    const params = new URLSearchParams({
      type: selectedModule,
      cadence,
      year: String(year),
      format,
    });
    if (cadence === "monthly") {
      params.set("month", String(month));
    }
    return `/api/crm/reports/download?${params.toString()}`;
  }

  return (
    <div className="bg-header/20 border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent-blue/15 text-accent-blue">
              <FileText size={18} />
            </div>
            <h2 className="text-base font-bold text-foreground">
              Intelligence & Performance Reports
            </h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Download comprehensive monthly or yearly reports for clients, leads, invoices, or executive summary.
          </p>
        </div>

        {configuredEmails.length > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-muted bg-header/40 px-3 py-1.5 rounded-lg border border-border">
            <CheckCircle2 size={13} className="text-accent-green" />
            <span>
              Auto-send configured for{" "}
              <strong className="text-foreground">{configuredEmails.length} email(s)</strong>
            </span>
          </div>
        ) : (
          <div className="text-xs text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/20">
            No recipient emails set in CRM Settings
          </div>
        )}
      </div>

      {/* Control selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Module Picker */}
        <div>
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 block">
            Report Module
          </label>
          <div className="relative">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-header/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-accent-blue outline-none transition-colors"
            >
              {MODULES.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cadence Picker */}
        <div>
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 block">
            Period Cadence
          </label>
          <div className="flex items-center rounded-lg border border-border bg-header/40 p-0.5">
            <button
              type="button"
              onClick={() => setCadence("monthly")}
              className={`flex-1 py-1.5 text-xs rounded font-medium transition-colors ${
                cadence === "monthly"
                  ? "bg-accent-blue text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCadence("yearly")}
              className={`flex-1 py-1.5 text-xs rounded font-medium transition-colors ${
                cadence === "yearly"
                  ? "bg-accent-blue text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Year Picker */}
        <div>
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 block">
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="w-full bg-header/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-accent-blue outline-none transition-colors"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Month Picker (disabled if yearly) */}
        <div>
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 block">
            Month
          </label>
          <select
            value={month}
            disabled={cadence === "yearly"}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="w-full bg-header/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-accent-blue outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-start gap-2.5 pt-2">
        <a
          href={getDownloadUrl("pdf")}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-accent-blue text-white hover:bg-accent-blue/90 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Download size={14} />
          <span>Download PDF</span>
        </a>

        <a
          href={getDownloadUrl("csv")}
          className="px-4 py-2 bg-header/50 border border-border hover:bg-header text-foreground rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
        >
          <FileSpreadsheet size={14} className="text-accent-green" />
          <span>Export CSV</span>
        </a>

        <button
          type="button"
          onClick={handleSendEmail}
          disabled={sending || configuredEmails.length === 0}
          className="px-4 py-2 bg-header/50 border border-border hover:bg-header text-foreground rounded-lg text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            configuredEmails.length === 0
              ? "Add recipient emails in CRM Settings to enable dispatch"
              : "Dispatches the Executive Report to the configured emails"
          }
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin text-accent-blue" />
          ) : (
            <Send size={14} className="text-accent-blue" />
          )}
          <span>Send Report to Recipients</span>
        </button>
      </div>
    </div>
  );
}
