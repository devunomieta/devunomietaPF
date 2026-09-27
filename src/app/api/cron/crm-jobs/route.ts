import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { drainCrmJobs } from "@/lib/crm/jobs";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const result = await drainCrmJobs(supabase);

  return NextResponse.json({ message: "CRM jobs drain completed", ...result });
}
