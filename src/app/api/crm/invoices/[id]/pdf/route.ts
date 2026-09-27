import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { renderInvoicePdf } from "@/lib/crm/invoice-pdf";
import type { CrmInvoice, CrmSettings } from "@/lib/crm/types";

export const maxDuration = 30;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let supabase;
  try {
    supabase = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: invoice } = await supabase.from("crm_invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const { data: client } = await supabase.from("crm_clients").select("name, email, company").eq("id", invoice.client_id).maybeSingle();
  const { data: settings } = await supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle();

  const pdfBuffer = await renderInvoicePdf(
    invoice as CrmInvoice,
    client || { name: "Client", email: null, company: null },
    settings as CrmSettings | null
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
