"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, UploadCloud, Trash2 } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { CrmModal, crmInputClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { CrmPageGuide } from "@/components/crm/CrmPageGuide";
import { CrmTooltip } from "@/components/crm/CrmTooltip";
import type { CrmClient } from "@/lib/crm/types";
import { deleteClient } from "./actions";
import { ClientForm } from "./ClientForm";

export function ClientsManager({ initialClients }: { initialClients: CrmClient[] }) {
  const { toast, confirm, canPerform } = useCrmFeedback();
  const [clients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmClient | null>(null);
  const pageSize = 20;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.email, c.company, c.location, c.website].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    );
  }, [clients, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  function openCreate() {
    if (!canPerform("clients_edit")) {
      toast("You don't have permission to create clients.");
      return;
    }
    setEditing(null);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!canPerform("clients_delete")) {
      toast("You don't have permission to delete clients.");
      return;
    }
    if (!(await confirm("Delete this client? This cannot be undone.", { danger: true, confirmLabel: "Delete" }))) return;
    const result = await deleteClient(id);
    if ("success" in result) window.location.reload();
    else toast(result.error);
  }

  const columns: CrmColumn<CrmClient>[] = [
    {
      header: "Company",
      cell: (c) => (
        <Link
          href={`/crm/clients/${c.id}`}
          className="font-medium text-foreground hover:text-accent-blue transition-colors"
        >
          {c.company || c.name || <span className="text-muted">—</span>}
        </Link>
      ),
    },
    {
      header: "Website",
      cell: (c) =>
        c.website ? (
          <a
            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent-blue hover:underline max-w-[200px] truncate block text-xs"
          >
            {c.website.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      header: "Phone",
      cell: (c) => (
        c.phone ? (
          <span className="text-foreground/90 text-xs font-mono">{c.phone}</span>
        ) : (
          <span className="text-muted">—</span>
        )
      ),
    },
    {
      header: "Source",
      cell: (c) => (
        <span className="text-muted text-xs capitalize">
          {c.source ? c.source.replace(/_/g, " ") : "—"}
        </span>
      ),
    },
    {
      header: "",
      cell: (c) => {
        if (!canPerform("clients_delete")) return null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(c.id);
            }}
            className="text-muted hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors"
            aria-label="Delete client"
          >
            <Trash2 size={15} />
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted">{clients.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {canPerform("clients_edit") && (
            <Link href="/crm/import" className={crmSecondaryBtnClass}>
              <UploadCloud size={15} className="inline mr-1.5 -mt-0.5" />
              Import
            </Link>
          )}
          {canPerform("clients_edit") && (
            <div className="flex items-center gap-1.5">
              <button onClick={openCreate} className={crmPrimaryBtnClass}>
                <Plus size={15} />
                Add client
              </button>
              <CrmTooltip text="Add an active client profile for billing, contacts, and contract management." />
            </div>
          )}
        </div>
      </div>

      <CrmPageGuide
        pageKey="clients"
        title="Active Clients & Customer Relationships"
        description="Clients are accounts with whom you have active or previous business engagements. From here, you can view company profiles, create invoices, send direct outreach, and record contact stakeholders."
        tips={[
          "Click on any client row to open invoices, pain point notes, and contacts.",
          "Use the direct Email or WhatsApp buttons inside the client profile for instant communication.",
          "Invoices created for a client are tracked in the billing section automatically.",
        ]}
      />

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, company..."
          className={`${crmInputClass} pl-9`}
        />
      </div>

      <div className="bg-header/20 border border-border rounded-xl p-2 sm:p-4">
        <ResponsiveTable
          columns={columns}
          rows={filtered}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={setPage}
          onRowClick={(c) => (window.location.href = `/crm/clients/${c.id}`)}
          emptyLabel="No clients yet — add one manually or import a spreadsheet."
        />
      </div>

      <CrmModal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit client" : "Add client"}>
        <ClientForm
          client={editing}
          onCancel={() => setIsModalOpen(false)}
          onDone={() => window.location.reload()}
        />
      </CrmModal>
    </div>
  );
}
