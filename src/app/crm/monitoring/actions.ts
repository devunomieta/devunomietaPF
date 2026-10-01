"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";
import { getDateRange, fetchExecutiveReportData, type ReportCadence } from "@/lib/crm/reports/data";
import { renderExecutivePdf } from "@/lib/crm/reports/pdf";
import { sendEmail } from "@/lib/brevo";
import { formatMoneyPlain } from "@/lib/crm/currency";
import type { ActionResult } from "@/lib/crm/types";

import { revalidatePath } from "next/cache";
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

export async function cancelJobAction(jobId: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("crm_jobs")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) return { error: error.message };

  revalidatePath("/crm/monitoring");
  return { success: true };
}

export async function sendTestReportAction(params: {
  cadence: ReportCadence;
  year: number;
  month?: number;
}): Promise<ActionResult & { recipientCount?: number }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized access" };
  }

  const supabase = createAdminClient();
  const { data: settings } = await supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle();

  const recipients: string[] = settings?.report_notification_emails || [];
  if (recipients.length === 0) {
    return {
      error: "No recipient emails configured. Please add recipient emails in CRM Settings first.",
    };
  }

  const range = getDateRange(params.cadence, params.year, params.month);
  const data = await fetchExecutiveReportData(supabase, range);
  const pdfBuffer = await renderExecutivePdf(data);
  const base64Pdf = pdfBuffer.toString("base64");
  const filename = `Executive_Report_${range.label.replace(/\s+/g, "_")}.pdf`;

  const grossInvoiced = formatMoneyPlain(data.invoicesSummary.grossInvoiced, data.invoicesSummary.currency);
  const netCollected = formatMoneyPlain(data.invoicesSummary.netCollected, data.invoicesSummary.currency);
  const totalReceivables = formatMoneyPlain(data.invoicesSummary.totalOutstanding, data.invoicesSummary.currency);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; line-height: 1.5;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; border-radius: 8px 8px 0 0;">
        <span style="background: #3b82f6; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Manual Trigger Test</span>
        <h1 style="margin: 8px 0 0; font-size: 20px;">CRM Performance Report: ${range.label}</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">Dispatched from CRM Monitoring Center</p>
      </div>

      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; margin-top: 0;">Attached is the executive dossier for <strong>${range.label}</strong>:</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;">Gross Revenue Billed</div>
            <div style="font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px;">${grossInvoiced}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;">Cash Collected</div>
            <div style="font-size: 18px; font-weight: bold; color: #16a34a; margin-top: 4px;">${netCollected}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;">Outstanding Receivables</div>
            <div style="font-size: 18px; font-weight: bold; color: #dc2626; margin-top: 4px;">${totalReceivables}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold;">Pipeline Win Rate</div>
            <div style="font-size: 18px; font-weight: bold; color: #0284c7; margin-top: 4px;">${data.leadsSummary.winRate}%</div>
          </div>
        </div>

        <p style="font-size: 13px; color: #475569;">
          Open the attached PDF (<code>${filename}</code>) for full breakdown tables.
        </p>
      </div>
    </div>
  `;

  const results = await Promise.allSettled(
    recipients.map((email) =>
      sendEmail({
        to: [{ email }],
        subject: `[Test Dispatch] CRM Performance Report: ${range.label}`,
        htmlContent: html,
        attachments: [
          {
            name: filename,
            content: base64Pdf,
          },
        ],
      })
    )
  );

  const sentCount = results.filter((r) => r.status === "fulfilled").length;
  if (sentCount === 0) {
    return { error: "Failed to dispatch email. Please check Brevo API key and logs." };
  }

  return { success: true, recipientCount: sentCount };
}
