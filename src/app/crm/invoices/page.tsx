import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Plus } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { crmPrimaryBtnClass } from "@/components/crm/CrmModal";
import { formatMoney } from "@/lib/crm/currency";

export const metadata = { title: "Invoices · CRM" };

type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  currency: string;
  total: number;
  due_date: string | null;
  created_at: string;
  crm_clients: { name: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted/20 text-muted",
  sent: "bg-accent-blue/15 text-accent-blue",
  viewed: "bg-accent-blue/15 text-accent-blue",
  partially_paid: "bg-yellow-400/15 text-yellow-400",
  paid: "bg-accent-green/15 text-accent-green",
  overpaid: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  overdue: "bg-red-400/15 text-red-400",
  void: "bg-muted/20 text-muted line-through",
};

export default async function CrmInvoicesPage() {
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("crm_invoices")
    .select("id, number, status, currency, total, due_date, created_at, crm_clients(name)")
    .order("created_at", { ascending: false });

  const rows = (invoices as unknown as InvoiceRow[]) || [];

  const columns: CrmColumn<InvoiceRow>[] = [
    {
      header: "Number",
      cell: (i) => (
        <Link href={`/crm/invoices/${i.id}`} className="font-medium text-foreground hover:text-accent-blue">
          {i.number}
        </Link>
      ),
    },
    { header: "Client", cell: (i) => i.crm_clients?.name || <span className="text-muted">—</span> },
    { header: "Total", cell: (i) => formatMoney(Number(i.total), i.currency) },
    { header: "Due", cell: (i) => (i.due_date ? new Date(i.due_date).toLocaleDateString() : "—") },
    {
      header: "Status",
      cell: (i) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[i.status] || ""}`}>{i.status.replace("_", " ")}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted">{rows.length} total</p>
        </div>
        <Link href="/crm/invoices/new" className={crmPrimaryBtnClass}>
          <Plus size={15} />
          New invoice
        </Link>
      </div>

      <div className="bg-header/20 border border-border rounded-xl p-2 sm:p-4">
        <ResponsiveTable columns={columns} rows={rows} emptyLabel="No invoices yet." />
      </div>
    </div>
  );
}
