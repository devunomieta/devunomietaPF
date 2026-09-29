import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ArrowLeft } from "lucide-react";
import type { CrmInvoice, CrmInvoicePayment } from "@/lib/crm/types";
import { InvoiceDetailClient } from "./InvoiceDetailClient";

export const metadata = { title: "Invoice · CRM" };
export const maxDuration = 30;

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("crm_invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice) notFound();

  const [{ data: client }, { data: payments }, { data: assistants }] = await Promise.all([
    supabase.from("crm_clients").select("id, name, email, company").eq("id", invoice.client_id).maybeSingle(),
    supabase.from("crm_invoice_payments").select("*").eq("invoice_id", id).order("paid_at", { ascending: false }),
    supabase.from("crm_users").select("id, display_name, email, role_title").order("display_name"),
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link href="/crm/invoices" className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} /> Invoices
      </Link>
      <InvoiceDetailClient
        invoice={invoice as CrmInvoice}
        client={client}
        payments={(payments as CrmInvoicePayment[]) || []}
        assistants={assistants || []}
      />
    </div>
  );
}
