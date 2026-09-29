"use client";

import { useMemo, useState } from "react";
import { Loader2, UploadCloud, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Layers, Check, ArrowRight } from "lucide-react";
import { crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { parseImportFile, checkExistingRecords, commitImport } from "./actions";

type Step = "upload" | "map" | "preview" | "done";

const CLIENT_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "website", label: "Website" },
  { key: "pain_points", label: "Pain Points (Identified Problems)" },
  { key: "proposed_solution", label: "Proposed Solution" },
  { key: "tags", label: "Tags" },
  { key: "notes", label: "Notes" },
];

const LEAD_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "website", label: "Website" },
  { key: "pain_points", label: "Pain Points (Identified Problems)" },
  { key: "proposed_solution", label: "Proposed Solution" },
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

  const [duplicates, setDuplicates] = useState<
    {
      rowIndex: number;
      matchReason: string;
      incoming: Record<string, string>;
      existing: { id: string; name?: string; email?: string | null; phone?: string | null; company?: string | null; current_stage_key?: string };
    }[]
  >([]);
  const [rowOverrides, setRowOverrides] = useState<Record<number, "skip" | "overwrite" | "merge">>({});
  const [showDuplicatesList, setShowDuplicatesList] = useState(false);

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

    // Best-effort auto-map by matching header names or known aliases to field keys.
    const aliases: Record<string, string[]> = {
      name: ["name", "fullname", "contactname", "clientname", "leadname"],
      email: ["email", "emailaddress", "mail"],
      phone: ["phone", "phonenumber", "tel", "telephone", "mobile", "whatsapp"],
      company: ["company", "companyname", "organization", "business", "businessname"],
      location: ["location", "city", "country", "state", "region", "address"],
      website: ["website", "site", "url", "web", "domain", "companywebsite"],
      pain_points: ["painpoints", "painpoint", "problem", "problems", "identifiedproblems", "challenges", "issues"],
      proposed_solution: ["proposedsolution", "solution", "solutions", "valueprop", "valueproposition", "pitch", "offer"],
      score: ["score", "leadscore", "priority", "rating"],
      tags: ["tags", "tag", "labels", "category", "categories"],
      notes: ["notes", "note", "description", "details", "comment", "comments"],
    };

    const autoMap: Record<string, string> = {};
    for (const field of fields) {
      const match = result.headers.find((h) => {
        const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        const targetClean = field.key.replace(/[^a-z0-9]/g, "");
        if (cleanH === targetClean) return true;
        const fieldAliases = aliases[field.key] || [];
        return fieldAliases.includes(cleanH);
      });
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
    const check = await checkExistingRecords(targetType, mapping, rows);
    setExistingCount(check.existingCount);
    setDuplicates(check.duplicates || []);
    setRowOverrides({});
    setShowDuplicatesList(false);
    setLoading(false);
    setStep("preview");
  }

  async function handleCommit() {
    setLoading(true);
    const res = await commitImport({ targetType, mapping, dedupStrategy, rowOverrides, rows });
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
            <div className="flex flex-col gap-3 bg-header/30 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {duplicates.length} Duplicate Record{duplicates.length === 1 ? "" : "s"} Flagged
                    </h3>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Choose a global default strategy below, or customize each flagged record individually.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDuplicatesList(!showDuplicatesList)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background/80 hover:bg-background text-foreground flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                >
                  <Layers size={13} />
                  <span>{showDuplicatesList ? "Hide Flagged Records" : `Inspect & Review (${duplicates.length})`}</span>
                  {showDuplicatesList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Batch Action Strategy Selector */}
              <div className="pt-2 border-t border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Batch Strategy (Applies to all duplicates):
                  </label>
                  {/* Reset individual overrides button if any are set */}
                  {Object.keys(rowOverrides).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRowOverrides({})}
                      className="text-[11px] text-accent-blue hover:underline self-start sm:self-auto"
                    >
                      Reset {Object.keys(rowOverrides).length} individual override(s) to match batch
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDedupStrategy("skip");
                      setRowOverrides({});
                    }}
                    className={`p-2 rounded-lg text-left border transition-all text-xs ${
                      dedupStrategy === "skip" && Object.keys(rowOverrides).length === 0
                        ? "border-accent-blue bg-accent-blue/15 text-foreground font-semibold"
                        : "border-border bg-background/60 text-muted hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Skip All</span>
                      {dedupStrategy === "skip" && Object.keys(rowOverrides).length === 0 && <Check size={12} className="text-accent-blue" />}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">Keep existing CRM records untouched</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDedupStrategy("merge");
                      setRowOverrides({});
                    }}
                    className={`p-2 rounded-lg text-left border transition-all text-xs ${
                      dedupStrategy === "merge" && Object.keys(rowOverrides).length === 0
                        ? "border-accent-blue bg-accent-blue/15 text-foreground font-semibold"
                        : "border-border bg-background/60 text-muted hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Merge All</span>
                      {dedupStrategy === "merge" && Object.keys(rowOverrides).length === 0 && <Check size={12} className="text-accent-blue" />}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">Only fill fields currently blank in CRM</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDedupStrategy("overwrite");
                      setRowOverrides({});
                    }}
                    className={`p-2 rounded-lg text-left border transition-all text-xs ${
                      dedupStrategy === "overwrite" && Object.keys(rowOverrides).length === 0
                        ? "border-accent-blue bg-accent-blue/15 text-foreground font-semibold"
                        : "border-border bg-background/60 text-muted hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Overwrite All</span>
                      {dedupStrategy === "overwrite" && Object.keys(rowOverrides).length === 0 && <Check size={12} className="text-accent-blue" />}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">Replace CRM data with spreadsheet values</p>
                  </button>
                </div>
              </div>

              {/* INDIVIDUAL DUPLICATE PREVIEW & ACTION STRIP */}
              {showDuplicatesList && (
                <div className="flex flex-col gap-2.5 mt-2 pt-3 border-t border-border/60 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                  <span className="text-xs font-semibold text-foreground">
                    Flagged Records Comparison & Individual Decision:
                  </span>
                  {duplicates.map((dup, i) => {
                    const rowNum = dup.rowIndex + 1;
                    const action = rowOverrides[dup.rowIndex] || dedupStrategy;
                    const incName = mapping.name ? dup.incoming[mapping.name] : "";
                    const incEmail = mapping.email ? dup.incoming[mapping.email] : "";
                    const incPhone = mapping.phone ? dup.incoming[mapping.phone] : "";
                    const incCompany = mapping.company ? dup.incoming[mapping.company] : "";

                    return (
                      <div
                        key={i}
                        className="bg-background/90 border border-border rounded-xl p-3 flex flex-col gap-2 text-xs"
                      >
                        {/* Header: Row # + Match Reason + Action pill */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-border/40">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">Row #{rowNum}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                              {dup.matchReason}
                            </span>
                            {dup.existing.current_stage_key && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-header text-muted border border-border">
                                Stage: {dup.existing.current_stage_key}
                              </span>
                            )}
                          </div>

                          {/* Individual Strategy Picker */}
                          <div className="flex items-center gap-1.5 self-start sm:self-auto">
                            <span className="text-[11px] text-muted">Action:</span>
                            <select
                              value={action}
                              onChange={(e) =>
                                setRowOverrides((prev) => ({
                                  ...prev,
                                  [dup.rowIndex]: e.target.value as "skip" | "overwrite" | "merge",
                                }))
                              }
                              className="bg-header border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:border-accent-blue outline-none cursor-pointer font-medium"
                            >
                              <option value="skip">Skip (Discard)</option>
                              <option value="merge">Merge (Fill Blanks)</option>
                              <option value="overwrite">Overwrite (Replace)</option>
                            </select>
                          </div>
                        </div>

                        {/* Side-by-Side Comparison: Existing Database vs Spreadsheet Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-header/40 p-2 rounded-lg border border-border/60">
                            <span className="font-bold text-muted block uppercase text-[10px] mb-1">
                              Existing In CRM:
                            </span>
                            <div className="space-y-0.5 text-muted">
                              <p><span className="text-foreground font-medium">Name:</span> {dup.existing.name || "—"}</p>
                              <p><span className="text-foreground font-medium">Email:</span> {dup.existing.email || "—"}</p>
                              <p><span className="text-foreground font-medium">Phone:</span> {dup.existing.phone || "—"}</p>
                              <p><span className="text-foreground font-medium">Company:</span> {dup.existing.company || "—"}</p>
                            </div>
                          </div>

                          <div className="bg-accent-blue/5 p-2 rounded-lg border border-accent-blue/20">
                            <span className="font-bold text-accent-blue block uppercase text-[10px] mb-1">
                              New In Spreadsheet:
                            </span>
                            <div className="space-y-0.5 text-muted">
                              <p><span className="text-foreground font-medium">Name:</span> {incName || "—"}</p>
                              <p><span className="text-foreground font-medium">Email:</span> {incEmail || "—"}</p>
                              <p><span className="text-foreground font-medium">Phone:</span> {incPhone || "—"}</p>
                              <p><span className="text-foreground font-medium">Company:</span> {incCompany || "—"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
