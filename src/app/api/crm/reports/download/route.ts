import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getDateRange,
  fetchClientsReportData,
  fetchLeadsReportData,
  fetchInvoicesReportData,
  fetchExecutiveReportData,
  type ReportCadence,
} from "@/lib/crm/reports/data";
import {
  renderClientsPdf,
  renderLeadsPdf,
  renderInvoicesPdf,
  renderExecutivePdf,
} from "@/lib/crm/reports/pdf";
import {
  serializeClientsCsv,
  serializeLeadsCsv,
  serializeInvoicesCsv,
  serializeExecutiveCsv,
} from "@/lib/crm/reports/csv";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "executive"; // executive, clients, leads, invoices
  const cadence = (searchParams.get("cadence") || "monthly") as ReportCadence;
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
  const format = searchParams.get("format") || "pdf"; // pdf or csv

  const supabase = createAdminClient();
  const range = getDateRange(cadence, year, month);

  // Generate CSV format
  if (format === "csv") {
    let csvContent = "";
    let filename = "";

    if (type === "clients") {
      const data = await fetchClientsReportData(supabase, range);
      csvContent = serializeClientsCsv(data);
      filename = `Clients_Report_${range.label.replace(/\s+/g, "_")}.csv`;
    } else if (type === "leads") {
      const data = await fetchLeadsReportData(supabase, range);
      csvContent = serializeLeadsCsv(data);
      filename = `Leads_Report_${range.label.replace(/\s+/g, "_")}.csv`;
    } else if (type === "invoices") {
      const data = await fetchInvoicesReportData(supabase, range);
      csvContent = serializeInvoicesCsv(data);
      filename = `Invoices_Report_${range.label.replace(/\s+/g, "_")}.csv`;
    } else {
      const data = await fetchExecutiveReportData(supabase, range);
      csvContent = serializeExecutiveCsv(data);
      filename = `Executive_Report_${range.label.replace(/\s+/g, "_")}.csv`;
    }

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Generate PDF format
  let pdfBuffer: Buffer;
  let filename = "";

  if (type === "clients") {
    const data = await fetchClientsReportData(supabase, range);
    pdfBuffer = await renderClientsPdf(data);
    filename = `Clients_Report_${range.label.replace(/\s+/g, "_")}.pdf`;
  } else if (type === "leads") {
    const data = await fetchLeadsReportData(supabase, range);
    pdfBuffer = await renderLeadsPdf(data);
    filename = `Leads_Report_${range.label.replace(/\s+/g, "_")}.pdf`;
  } else if (type === "invoices") {
    const data = await fetchInvoicesReportData(supabase, range);
    pdfBuffer = await renderInvoicesPdf(data);
    filename = `Invoices_Report_${range.label.replace(/\s+/g, "_")}.pdf`;
  } else {
    const data = await fetchExecutiveReportData(supabase, range);
    pdfBuffer = await renderExecutivePdf(data);
    filename = `Executive_Report_${range.label.replace(/\s+/g, "_")}.pdf`;
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
