"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseSpreadsheet } from "@/lib/crm/spreadsheet";
import { processImportJobBatch } from "@/lib/crm/jobs";

type ParseResult =
  | { error: string }
  | { success: true; headers: string[]; rows: Record<string, string>[] };

export async function parseImportFile(formData: FormData): Promise<ParseResult> {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file uploaded." };

  const allowed = [".xlsx", ".xls", ".csv"];
  if (!allowed.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return { error: "Please upload a .xlsx, .xls, or .csv file." };
  }

  try {
    const buffer = await file.arrayBuffer();
    const { headers, rows } = parseSpreadsheet(buffer);
    if (rows.length === 0) return { error: "No data rows found in that file." };
    return { success: true as const, headers, rows };
  } catch {
    return { error: "Couldn't read that file — is it a valid spreadsheet?" };
  }
}

function cleanPhone(raw: unknown): string {
  if (!raw) return "";
  return String(raw).replace(/[^\d+]/g, "").trim();
}

export async function checkExistingRecords(
  targetType: "client" | "lead",
  mapping: Record<string, string>,
  rows: Record<string, string>[]
) {
  const supabase = await requireAdmin();
  const table = targetType === "client" ? "crm_clients" : "crm_leads";

  // Gather all potential identifiers from the spreadsheet rows
  const emails = new Set<string>();
  const phones = new Set<string>();
  const nameCompanyPairs: { name: string; company?: string }[] = [];

  for (const r of rows) {
    const email = mapping.email ? r[mapping.email]?.trim().toLowerCase() : "";
    if (email) emails.add(email);

    const phone = mapping.phone ? cleanPhone(r[mapping.phone]) : "";
    if (phone && phone.length >= 7) phones.add(phone);

    const name = mapping.name ? r[mapping.name]?.trim().toLowerCase() : "";
    const company = mapping.company ? r[mapping.company]?.trim().toLowerCase() : "";
    if (name) {
      nameCompanyPairs.push({ name, company });
    }
  }

  // Fetch candidate existing records from database
  // We can select email, phone, name, company to match in-memory accurately
  const query = supabase.from(table).select("id, name, email, phone, company");
  const { data: existingRows } = await query;

  if (!existingRows || existingRows.length === 0) {
    return { existingCount: 0 };
  }

  // Build indexed lookups for fast multi-field matching
  const emailMap = new Map<string, string>();
  const phoneMap = new Map<string, string>();
  const nameCompanyMap = new Map<string, string>();

  for (const row of existingRows) {
    if (row.email) {
      emailMap.set(String(row.email).trim().toLowerCase(), row.id);
    }
    const cleanedPhone = cleanPhone(row.phone);
    if (cleanedPhone && cleanedPhone.length >= 7) {
      phoneMap.set(cleanedPhone, row.id);
      // Also match without leading + if present
      phoneMap.set(cleanedPhone.replace(/^\+/, ""), row.id);
    }
    const n = String(row.name || "").trim().toLowerCase();
    const c = String(row.company || "").trim().toLowerCase();
    if (n) {
      nameCompanyMap.set(`${n}:::${c}`, row.id);
    }
  }

  // Build details of every matched duplicate row with the matched database record
  const duplicates: {
    rowIndex: number;
    matchReason: string;
    incoming: Record<string, string>;
    existing: { id: string; name?: string; email?: string | null; phone?: string | null; company?: string | null; current_stage_key?: string };
  }[] = [];

  rows.forEach((r, idx) => {
    const email = mapping.email ? r[mapping.email]?.trim().toLowerCase() : "";
    const phone = mapping.phone ? cleanPhone(r[mapping.phone]) : "";
    const name = mapping.name ? r[mapping.name]?.trim().toLowerCase() : "";
    const company = mapping.company ? r[mapping.company]?.trim().toLowerCase() : "";

    let matchedRow: ({ id: string } & Record<string, unknown>) | undefined;
    let matchReason = "";

    if (email && emailMap.has(email)) {
      const matchId = emailMap.get(email);
      matchedRow = existingRows.find((row) => row.id === matchId);
      matchReason = "Matched by Email";
    } else if (phone && (phoneMap.has(phone) || phoneMap.has(phone.replace(/^\+/, "")))) {
      const matchId = phoneMap.get(phone) || phoneMap.get(phone.replace(/^\+/, ""));
      matchedRow = existingRows.find((row) => row.id === matchId);
      matchReason = "Matched by Phone";
    } else if (name && company && nameCompanyMap.has(`${name}:::${company}`)) {
      const matchId = nameCompanyMap.get(`${name}:::${company}`);
      matchedRow = existingRows.find((row) => row.id === matchId);
      matchReason = "Matched by Name & Company";
    } else if (name && !company && nameCompanyMap.has(`${name}:::`)) {
      const matchId = nameCompanyMap.get(`${name}:::`);
      matchedRow = existingRows.find((row) => row.id === matchId);
      matchReason = "Matched by Name";
    }

    if (matchedRow) {
      duplicates.push({
        rowIndex: idx,
        matchReason,
        incoming: r,
        existing: {
          id: matchedRow.id,
          name: matchedRow.name as string | undefined,
          email: matchedRow.email as string | null | undefined,
          phone: matchedRow.phone as string | null | undefined,
          company: matchedRow.company as string | null | undefined,
          current_stage_key: (matchedRow as { current_stage_key?: string }).current_stage_key,
        },
      });
    }
  });

  return { existingCount: duplicates.length, duplicates };
}

// Backward compatibility export
export async function checkExistingEmails(targetType: "client" | "lead", emails: string[]) {
  const supabase = await requireAdmin();
  const table = targetType === "client" ? "crm_clients" : "crm_leads";
  const cleaned = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (cleaned.length === 0) return { existing: [] as string[] };
  const { data } = await supabase.from(table).select("email").in("email", cleaned);
  return { existing: (data || []).map((r) => String(r.email).toLowerCase()) };
}

type CommitResult =
  | { error: string }
  | {
      success: true;
      jobId: string;
      done: boolean;
      progress: number;
      total: number;
      stats?: { imported: number; updated: number; skipped: number };
    };

export async function commitImport({
  targetType,
  mapping,
  dedupStrategy,
  rowOverrides,
  rows,
}: {
  targetType: "client" | "lead";
  mapping: Record<string, string>;
  dedupStrategy: "skip" | "overwrite" | "merge";
  rowOverrides?: Record<number, "skip" | "overwrite" | "merge">;
  rows: Record<string, string>[];
}): Promise<CommitResult> {
  const supabase = await requireAdmin();

  if (!mapping.name) return { error: "Map a column to Name — it's required." };
  if (rows.length === 0) return { error: "Nothing to import." };

  const { data: job, error } = await supabase
    .from("crm_jobs")
    .insert([
      {
        type: "import",
        status: "processing",
        payload: { targetType, mapping, dedupStrategy, rowOverrides: rowOverrides || {}, rows, stats: { imported: 0, updated: 0, skipped: 0 } },
        total: rows.length,
        progress: 0,
      },
    ])
    .select("*")
    .single();

  if (error || !job) return { error: error?.message || "Could not create the import job." };

  // Drain a few batches synchronously so small/medium imports finish immediately.
  let current = job;
  for (let i = 0; i < 5; i++) {
    const result = await processImportJobBatch(supabase, current as never);
    if (result.done) break;
    const { data: refreshed } = await supabase.from("crm_jobs").select("*").eq("id", job.id).single();
    if (!refreshed) break;
    current = refreshed;
  }

  const { data: finalJob } = await supabase.from("crm_jobs").select("*").eq("id", job.id).single();

  revalidatePath("/crm/clients");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/monitoring");

  return {
    success: true as const,
    jobId: job.id,
    done: finalJob?.status === "done",
    progress: finalJob?.progress ?? 0,
    total: finalJob?.total ?? rows.length,
    stats: (finalJob?.payload as { stats?: { imported: number; updated: number; skipped: number } } | null)?.stats,
  };
}
