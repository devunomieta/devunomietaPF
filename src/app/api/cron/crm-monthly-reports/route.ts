import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getDateRange, fetchExecutiveReportData } from "@/lib/crm/reports/data";
import { renderExecutivePdf } from "@/lib/crm/reports/pdf";
import { sendEmail } from "@/lib/brevo";
import { formatMoneyPlain } from "@/lib/crm/currency";

export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Check CRM Settings
  const { data: settings } = await supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle();

  if (!settings?.report_auto_send) {
    return NextResponse.json({ message: "Automated monthly reports are disabled in CRM settings." });
  }

  const recipients: string[] = settings?.report_notification_emails || [];
  if (recipients.length === 0) {
    return NextResponse.json({ message: "No recipient emails configured in CRM settings." });
  }

  // 2. Determine previous completed month
  const now = new Date();
  let prevMonth = now.getUTCMonth(); // 0-indexed: current month minus 1 is previous month (0 = Jan)
  let prevYear = now.getUTCFullYear();
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const range = getDateRange("monthly", prevYear, prevMonth);

  // 3. Compile Executive report data & render PDF
  const data = await fetchExecutiveReportData(supabase, range);
  const pdfBuffer = await renderExecutivePdf(data);
  const base64Pdf = pdfBuffer.toString("base64");
  const filename = `Executive_Report_${range.label.replace(/\s+/g, "_")}.pdf`;

  // 4. Compose notification HTML email with summary KPI highlights
  const grossInvoiced = formatMoneyPlain(data.invoicesSummary.grossInvoiced, data.invoicesSummary.currency);
  const netCollected = formatMoneyPlain(data.invoicesSummary.netCollected, data.invoicesSummary.currency);
  const totalReceivables = formatMoneyPlain(data.invoicesSummary.totalOutstanding, data.invoicesSummary.currency);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; line-height: 1.5;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Monthly Executive Performance Report</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">${range.label} · Generated for ${settings.business_name || "CRM Administration"}</p>
      </div>

      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; margin-top: 0;">Attached is your executive performance dossier for <strong>${range.label}</strong>. Below is an overview of key performance indicators at a glance:</p>

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
          Review the attached PDF (<code>${filename}</code>) for full breakdown tables covering client profiles, aging schedules, and pipeline conversion details.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">
          Sent automatically by your portfolio CRM system. Manage notification preferences in CRM Settings.
        </p>
      </div>
    </div>
  `;

  // 5. Dispatch via Brevo
  const results = await Promise.allSettled(
    recipients.map((email) =>
      sendEmail({
        to: [{ email }],
        subject: `Monthly Executive Report: ${range.label}`,
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

  // Dispatch CRM in-app notification
  try {
    const { createCrmNotification } = await import("@/lib/crm/notifications");
    await createCrmNotification({
      title: "Monthly Executive Report Generated 📊",
      message: `The executive report for ${range.label} was compiled and sent to ${sentCount}/${recipients.length} recipients.`,
      category: "monitoring",
      severity: "info",
      required_page_permission: "monitoring",
      link_url: "/crm/monitoring",
      entity_type: "report",
    });
  } catch (e) {
    console.warn("Could not dispatch report notification:", e);
  }

  return NextResponse.json({
    success: true,
    sentCount,
    totalRecipients: recipients.length,
    period: range.label,
  });
}
