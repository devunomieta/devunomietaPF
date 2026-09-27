"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import { drainCrmJobs } from "@/lib/crm/jobs";

export async function processJobsNow(): Promise<{ jobsTouched: number }> {
  const supabase = await requireAdmin();
  const result = await drainCrmJobs(supabase);
  revalidatePath("/crm/monitoring");
  revalidatePath("/crm/clients");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/campaigns");
  return result;
}
