"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, UploadCloud, Trash2 } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { CrmModal, crmInputClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import type { CrmLead } from "@/lib/crm/types";
import { deleteLead } from "./actions";
import { LeadForm } from "./LeadForm";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-accent-blue/15 text-accent-blue",
  won: "bg-accent-green/15 text-accent-green",
  lost: "bg-red-400/15 text-red-400",
};

export function LeadsManager({ initialLeads }: { initialLeads: CrmLead[] }) {
  const { toast, confirm } = useCrmFeedback();
  const [leads] = useState(initialLeads);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pageSize = 20;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.email, l.company, l.location, l.website].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    );
  }, [leads, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  async function handleDelete(id: string) {
    if (!(await confirm("Delete this lead? This cannot be undone.", { danger: true, confirmLabel: "Delete" }))) return;
    const result = await deleteLead(id);
    if ("success" in result) window.location.reload();
    else toast(result.error);
  }

  const columns: CrmColumn<CrmLead>[] = [
    {
      header: "Name",
      cell: (l) => (
        <Link href={`/crm/leads/${l.id}`} className="font-medium text-foreground hover:text-accent-blue">
          {l.name}
        </Link>
      ),
    },
    { header: "Company", cell: (l) => l.company || <span className="text-muted">—</span> },
    { header: "Location", cell: (l) => l.location || <span className="text-muted">—</span> },
    {
      header: "Website",
      cell: (l) =>
        l.website ? (
          <a
            href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent-blue hover:underline max-w-[140px] truncate block text-xs"
          >
            {l.website.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { header: "Stage", cell: (l) => <span className="text-muted">{l.current_stage_key}</span> },
    { header: "Score", cell: (l) => l.score },
    {
      header: "Status",
      cell: (l) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[l.status]}`}>{l.status}</span>
      ),
    },
    { header: "Source", cell: (l) => <span className="text-muted text-xs">{l.source || "—"}</span> },
    {
      header: "",
      cell: (l) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(l.id);
          }}
          className="text-muted hover:text-red-400"
          aria-label="Delete lead"
        >
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted">{leads.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm/import" className={crmSecondaryBtnClass}>
            <UploadCloud size={15} className="inline mr-1.5 -mt-0.5" />
            Import
          </Link>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all text-sm flex items-center gap-2">
            <Plus size={15} />
            Add lead
          </button>
        </div>
      </div>

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
          onRowClick={(l) => (window.location.href = `/crm/leads/${l.id}`)}
          emptyLabel="No leads yet — add one manually or import a spreadsheet."
        />
      </div>

      <CrmModal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add lead">
        <LeadForm onCancel={() => setIsModalOpen(false)} onDone={() => window.location.reload()} />
      </CrmModal>
    </div>
  );
}
