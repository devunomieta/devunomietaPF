"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseSpreadsheet } from "@/lib/crm/spreadsheet";
import { processImportJobBatch } from "@/lib/crm/jobs";

export async function parseImportFile(formData: FormData) {
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

export async function checkExistingEmails(targetType: "client" | "lead", emails: string[]) {
  const supabase = await requireAdmin();
  const table = targetType === "client" ? "crm_clients" : "crm_leads";
  const cleaned = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (cleaned.length === 0) return { existing: [] as string[] };
  const { data } = await supabase.from(table).select("email").in("email", cleaned);
  return { existing: (data || []).map((r) => String(r.email).toLowerCase()) };
}

export async function commitImport({
  targetType,
  mapping,
  dedupStrategy,
  rows,
}: {
  targetType: "client" | "lead";
  mapping: Record<string, string>;
  dedupStrategy: "skip" | "overwrite" | "merge";
  rows: Record<string, string>[];
}) {
  const supabase = await requireAdmin();

  if (!mapping.name) return { error: "Map a column to Name — it's required." };
  if (rows.length === 0) return { error: "Nothing to import." };

  const { data: job, error } = await supabase
    .from("crm_jobs")
    .insert([
      {
        type: "import",
        status: "processing",
        payload: { targetType, mapping, dedupStrategy, rows, stats: { imported: 0, updated: 0, skipped: 0 } },
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
    stats: finalJob?.payload?.stats,
  };
}
