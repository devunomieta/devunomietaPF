"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Mail, Eye, MousePointerClick, Send, CheckCircle2, AlertCircle, FileEdit, ArrowRight, Copy, Trash2, CheckSquare, Square } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { CrmPageGuide } from "@/components/crm/CrmPageGuide";
import { CrmTooltip } from "@/components/crm/CrmTooltip";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { deleteCampaign, batchDeleteCampaigns } from "./actions";

export type CampaignWithMetrics = {
  id: string;
  subject: string;
  kind: string;
  status: string;
  sent_count: number;
  total_recipients: number;
  created_at: string;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounce_count: number;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted/20 text-muted",
  queued: "bg-yellow-400/15 text-yellow-400",
  sending: "bg-accent-blue/15 text-accent-blue",
  sent: "bg-accent-green/15 text-accent-green",
  failed: "bg-red-400/15 text-red-400",
};

export function CampaignsListClient({ campaigns }: { campaigns: CampaignWithMetrics[] }) {
  const router = useRouter();
  const { toast, confirm } = useCrmFeedback();
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const pageSize = 20;

  const toggleSelectAll = () => {
    if (selectedIds.length === campaigns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(campaigns.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSingle = async (campaign: CampaignWithMetrics) => {
    const confirmed = await confirm(
      `Delete "${campaign.subject || "Untitled Draft"}"? All associated metrics will be removed permanently.`,
      { danger: true, confirmLabel: "Delete Campaign" }
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const res = await deleteCampaign(campaign.id);
    setIsDeleting(false);

    if ("success" in res) {
      toast("Campaign deleted successfully.");
      setSelectedIds((prev) => prev.filter((id) => id !== campaign.id));
      router.refresh();
    } else {
      toast(res.error || "Failed to delete campaign.");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm(
      `Delete ${selectedIds.length} selected campaign(s)? This action cannot be undone.`,
      { danger: true, confirmLabel: `Delete ${selectedIds.length} Campaigns` }
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const res = await batchDeleteCampaigns(selectedIds);
    setIsDeleting(false);

    if ("success" in res) {
      toast(`${selectedIds.length} campaign(s) deleted.`);
      setSelectedIds([]);
      router.refresh();
    } else {
      toast(res.error || "Failed to batch delete campaigns.");
    }
  };

  // Aggregate stats across all campaigns
  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicked_count || 0), 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
  const avgClickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;

  const allSelected = campaigns.length > 0 && selectedIds.length === campaigns.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < campaigns.length;

  const columns: CrmColumn<CampaignWithMetrics>[] = [
    {
      header: (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleSelectAll();
          }}
          className="p-1 text-muted hover:text-foreground transition-colors"
          title={allSelected ? "Deselect all" : "Select all"}
        >
          {allSelected ? (
            <CheckSquare size={16} className="text-accent-blue" />
          ) : isIndeterminate ? (
            <div className="w-4 h-4 border border-accent-blue bg-accent-blue/20 rounded flex items-center justify-center text-[10px] text-accent-blue font-bold">
              -
            </div>
          ) : (
            <Square size={16} />
          )}
        </button>
      ),
      cell: (c) => {
        const isChecked = selectedIds.includes(c.id);
        return (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center">
            <button
              type="button"
              onClick={() => toggleSelectOne(c.id)}
              className="p-1 text-muted hover:text-foreground transition-colors"
              title={isChecked ? "Deselect" : "Select"}
            >
              {isChecked ? (
                <CheckSquare size={16} className="text-accent-blue" />
              ) : (
                <Square size={16} />
              )}
            </button>
          </div>
        );
      },
    },
    {
      header: "Campaign / Subject",
      cell: (c) => (
        <div className="flex flex-col gap-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground group-hover:text-accent-blue transition-colors">
              {c.subject || "(Untitled Draft)"}
            </span>
            {c.status === "draft" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue font-semibold">
                Draft
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted capitalize">
            {c.kind} Campaign · Created {new Date(c.created_at).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (c) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[c.status] || ""}`}>
          {c.status}
        </span>
      ),
    },
    {
      header: "Delivery",
      cell: (c) => (
        <div className="text-xs">
          <span className="font-semibold text-foreground">
            {c.sent_count}
          </span>
          <span className="text-muted"> / {c.total_recipients || c.sent_count} sent</span>
        </div>
      ),
    },
    {
      header: "Open Rate",
      cell: (c) => {
        if (c.status === "draft") return <span className="text-muted text-xs">—</span>;
        const rate = c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-12 bg-header/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-accent-green h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, rate)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-foreground">{rate}%</span>
            <span className="text-[11px] text-muted">({c.opened_count})</span>
          </div>
        );
      },
    },
    {
      header: "Click Rate",
      cell: (c) => {
        if (c.status === "draft") return <span className="text-muted text-xs">—</span>;
        const rate = c.sent_count > 0 ? Math.round((c.clicked_count / c.sent_count) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-12 bg-header/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-accent-blue h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, rate)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-foreground">{rate}%</span>
            <span className="text-[11px] text-muted">({c.clicked_count})</span>
          </div>
        );
      },
    },
    {
      header: "",
      cell: (c) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/crm/campaigns/new?duplicateId=${c.id}`}
            title="Duplicate & Edit"
            className="p-1 rounded-md text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
          >
            <Copy size={14} />
          </Link>

          {c.status === "draft" ? (
            <Link
              href={`/crm/campaigns/new?draftId=${c.id}`}
              className="inline-flex items-center gap-1 text-xs text-accent-blue font-medium hover:underline"
            >
              Resume <ArrowRight size={13} />
            </Link>
          ) : (
            <Link
              href={`/crm/campaigns/${c.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground hover:underline"
            >
              Analytics <ArrowRight size={13} />
            </Link>
          )}

          <button
            type="button"
            onClick={() => handleDeleteSingle(c)}
            disabled={isDeleting}
            title="Delete campaign"
            className="p-1 rounded-md text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors ml-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Email Campaigns</h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Single sends and bulk campaigns with real-time delivery and engagement analytics.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/crm/campaigns/new" className={crmPrimaryBtnClass}>
            <Plus size={15} />
            <span>New Campaign</span>
          </Link>
          <CrmTooltip text="Draft or schedule an email broadcast to a targeted audience of clients or leads." />
        </div>
      </div>

      <CrmPageGuide
        pageKey="campaigns"
        title="Email Campaigns & Broadcasts"
        description="Compose personalized outreach emails or broadcasts, filter recipients by pipeline stage or tags, and track live engagement metrics."
        tips={[
          "Click 'New Campaign' to start an email draft using bulletproof responsive templates.",
          "Use tags or journey stage filters to target only specific subsets of your contacts.",
          "Click on any sent campaign to view detailed delivery, open, and click activity in real-time.",
        ]}
      />

      {/* High-level Engagement Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-header/20 border border-border/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Campaigns</span>
            <Mail size={15} className="text-accent-blue" />
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">{totalCampaigns}</span>
            <span className="text-xs text-muted block mt-0.5">Dispatched or in draft</span>
          </div>
        </div>

        <div className="bg-header/20 border border-border/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Emails Delivered</span>
            <Send size={15} className="text-accent-green" />
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">{totalSent}</span>
            <span className="text-xs text-muted block mt-0.5">Total recipients reached</span>
          </div>
        </div>

        <div className="bg-header/20 border border-border/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Open Rate</span>
            <Eye size={15} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{avgOpenRate}%</span>
              <span className="text-xs text-emerald-400 font-medium">({totalOpens} opened)</span>
            </div>
            <span className="text-xs text-muted block mt-0.5">Industry avg ~21%</span>
          </div>
        </div>

        <div className="bg-header/20 border border-border/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Click Rate</span>
            <MousePointerClick size={15} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{avgClickRate}%</span>
              <span className="text-xs text-indigo-400 font-medium">({totalClicks} clicks)</span>
            </div>
            <span className="text-xs text-muted block mt-0.5">Industry avg ~2.5%</span>
          </div>
        </div>
      </div>

      {/* Campaigns Table with Full Row Clickability */}
      <div className="bg-header/20 border border-border rounded-2xl p-2 sm:p-4 shadow-xs flex flex-col gap-3">
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-header/60 border border-border/80 px-4 py-2.5 rounded-xl animate-in fade-in duration-200">
            <span className="text-xs text-foreground font-medium">
              <span className="font-semibold text-accent-blue">{selectedIds.length}</span> campaign{selectedIds.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 text-xs text-muted hover:text-foreground transition-colors"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}</span>
              </button>
            </div>
          </div>
        )}

        <ResponsiveTable
          columns={columns}
          rows={campaigns}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={setPage}
          emptyLabel="No campaigns sent yet."
          onRowClick={(campaign) => {
            if (campaign.status === "draft") {
              router.push(`/crm/campaigns/new?draftId=${campaign.id}`);
            } else {
              router.push(`/crm/campaigns/${campaign.id}`);
            }
          }}
        />
      </div>
    </div>
  );
}
