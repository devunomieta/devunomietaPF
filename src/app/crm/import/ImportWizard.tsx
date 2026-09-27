"use client";

import { useMemo, useState } from "react";
import { Loader2, UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { parseImportFile, checkExistingEmails, commitImport } from "./actions";

type Step = "upload" | "map" | "preview" | "done";

const CLIENT_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "tags", label: "Tags" },
  { key: "notes", label: "Notes" },
];

const LEAD_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "score", label: "Score" },
  { key: "tags", label: "Tags" },
  { key: "notes", label: "Notes" },
];

export function ImportWizard() {
  const { toast } = useCrmFeedback();
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [targetType, setTargetType] = useState<"client" | "lead">("lead");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dedupStrategy, setDedupStrategy] = useState<"skip" | "overwrite" | "merge">("skip");
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const [result, setResult] = useState<{ jobId: string; done: boolean; progress: number; total: number; stats?: { imported: number; updated: number; skipped: number } } | null>(null);

  const fields = targetType === "client" ? CLIENT_FIELDS : LEAD_FIELDS;

  const missingNameCount = useMemo(() => {
    if (!mapping.name) return rows.length;
    return rows.filter((r) => !r[mapping.name]?.trim()).length;
  }, [rows, mapping.name]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await parseImportFile(formData);
    setLoading(false);
    if ("error" in result) {
      toast(result.error);
      return;
    }
    setHeaders(result.headers);
    setRows(result.rows);

    // Best-effort auto-map by matching header names to field keys.
    const autoMap: Record<string, string> = {};
    for (const field of fields) {
      const match = result.headers.find((h) => h.toLowerCase().replace(/[^a-z]/g, "") === field.key);
      if (match) autoMap[field.key] = match;
    }
    setMapping(autoMap);
    setStep("map");
  }

  async function handleContinueToPreview() {
    if (!mapping.name) {
      toast("Map a column to Name — it's required.");
      return;
    }
    setLoading(true);
    const emailHeader = mapping.email;
    const emails = emailHeader ? rows.map((r) => r[emailHeader]).filter(Boolean) : [];
    const check = await checkExistingEmails(targetType, emails);
    setExistingCount(check.existing.length);
    setLoading(false);
    setStep("preview");
  }

  async function handleCommit() {
    setLoading(true);
    const res = await commitImport({ targetType, mapping, dedupStrategy, rows });
    setLoading(false);
    if ("error" in res) {
      toast(res.error);
      return;
    }
    setResult(res);
    setStep("done");
  }

  if (step === "done" && result) {
    return (
      <div className="bg-header/20 border border-border rounded-xl p-6 flex flex-col items-center text-center gap-3">
        <CheckCircle2 size={32} className="text-accent-green" />
        <h2 className="text-lg font-semibold text-foreground">
          {result.done ? "Import complete" : "Import started"}
        </h2>
        {result.stats && (
          <p className="text-sm text-muted">
            {result.stats.imported} added · {result.stats.updated} updated · {result.stats.skipped} skipped
          </p>
        )}
        {!result.done && (
          <p className="text-sm text-muted max-w-md">
            {result.progress} of {result.total} rows processed so far — the rest will finish from Monitoring
            (or automatically on the next scheduled run).
          </p>
        )}
        <div className="flex gap-2 mt-2">
          <a href={targetType === "client" ? "/crm/clients" : "/crm/leads"} className={crmPrimaryBtnClass}>
            View {targetType === "client" ? "clients" : "leads"}
          </a>
          <button
            onClick={() => {
              setStep("upload");
              setHeaders([]);
              setRows([]);
              setMapping({});
              setResult(null);
            }}
            className={crmSecondaryBtnClass}
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-header/20 border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted">
        {(["upload", "map", "preview"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s ? "bg-accent-blue text-white" : "bg-border text-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className={step === s ? "text-foreground" : ""}>{s === "upload" ? "Upload" : s === "map" ? "Map columns" : "Review"}</span>
            {i < 2 && <span className="mx-1">→</span>}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div>
            <label className={crmLabelClass}>Importing as</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType("lead")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${targetType === "lead" ? "bg-accent-blue text-white border-accent-blue" : "border-border text-muted"}`}
              >
                Leads
              </button>
              <button
                type="button"
                onClick={() => setTargetType("client")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${targetType === "client" ? "bg-accent-blue text-white border-accent-blue" : "border-border text-muted"}`}
              >
                Clients
              </button>
            </div>
          </div>
          <div>
            <label className={crmLabelClass} htmlFor="file">Spreadsheet file (.xlsx, .xls, .csv)</label>
            <input id="file" name="file" type="file" accept=".xlsx,.xls,.csv" required className={crmInputClass} />
          </div>
          <button type="submit" disabled={loading} className={`${crmPrimaryBtnClass} self-start`}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            Parse file
          </button>
        </form>
      )}

      {step === "map" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{rows.length} rows found. Map each CRM field to a column from your file.</p>
          <div className="flex flex-col gap-2">
            {fields.map((field) => (
              <div key={field.key} className="grid grid-cols-2 gap-3 items-center">
                <label className="text-sm text-foreground">
                  {field.label}
                  {field.required && <span className="text-red-400"> *</span>}
                </label>
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value }))}
                  className={crmInputClass}
                >
                  <option value="">— Don&apos;t import —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2">
            <button onClick={() => setStep("upload")} className={crmSecondaryBtnClass}>Back</button>
            <button onClick={handleContinueToPreview} disabled={loading} className={crmPrimaryBtnClass}>
              {loading && <Loader2 size={15} className="animate-spin" />}
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-background border border-border rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{rows.length}</p>
              <p className="text-xs text-muted">rows in file</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-accent-green">{rows.length - missingNameCount}</p>
              <p className="text-xs text-muted">will be imported</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-yellow-400">{existingCount ?? 0}</p>
              <p className="text-xs text-muted">match existing records</p>
            </div>
          </div>

          {missingNameCount > 0 && (
            <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{missingNameCount} row(s) are missing a name and will be skipped.</span>
            </div>
          )}

          {(existingCount ?? 0) > 0 && (
            <div>
              <label className={crmLabelClass}>On duplicate email</label>
              <select value={dedupStrategy} onChange={(e) => setDedupStrategy(e.target.value as typeof dedupStrategy)} className={crmInputClass}>
                <option value="skip">Skip — keep the existing record as is</option>
                <option value="overwrite">Overwrite — replace with the imported data</option>
                <option value="merge">Merge — only fill in currently empty fields</option>
              </select>
            </div>
          )}

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  {fields.filter((f) => mapping[f.key]).map((f) => (
                    <th key={f.key} className="py-2 px-2 font-medium whitespace-nowrap">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {fields.filter((f) => mapping[f.key]).map((f) => (
                      <td key={f.key} className="py-1.5 px-2 text-muted whitespace-nowrap max-w-[160px] truncate">
                        {row[mapping[f.key]] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 8 && <p className="text-xs text-muted px-2 py-1.5">…and {rows.length - 8} more rows</p>}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button onClick={() => setStep("map")} className={crmSecondaryBtnClass}>Back</button>
            <button onClick={handleCommit} disabled={loading} className={crmPrimaryBtnClass}>
              {loading && <Loader2 size={15} className="animate-spin" />}
              Import {rows.length - missingNameCount} rows
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
