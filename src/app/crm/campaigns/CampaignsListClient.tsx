"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Mail, Eye, MousePointerClick, Send, CheckCircle2, AlertCircle, FileEdit, ArrowRight } from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { crmPrimaryBtnClass } from "@/components/crm/CrmModal";

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

  // Aggregate stats across all campaigns
  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicked_count || 0), 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
  const avgClickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;

  const columns: CrmColumn<CampaignWithMetrics>[] = [
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
        <div className="flex justify-end">
          {c.status === "draft" ? (
            <span className="inline-flex items-center gap-1 text-xs text-accent-blue font-medium hover:underline">
              Resume <ArrowRight size={13} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
              Analytics <ArrowRight size={13} />
            </span>
          )}
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
        <Link href="/crm/campaigns/new" className={crmPrimaryBtnClass}>
          <Plus size={15} />
          <span>New Campaign</span>
        </Link>
      </div>

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
      <div className="bg-header/20 border border-border rounded-2xl p-2 sm:p-4 shadow-xs">
        <ResponsiveTable
          columns={columns}
          rows={campaigns}
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
