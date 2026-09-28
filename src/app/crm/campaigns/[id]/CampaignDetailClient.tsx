"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Eye, 
  MousePointerClick, 
  AlertTriangle, 
  UserX, 
  FileText, 
  Activity, 
  Search,
  ExternalLink,
  Calendar,
  Layers
} from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";

export type CampaignRecord = {
  id: string;
  subject: string;
  kind: string;
  status: string;
  html: string | null;
  sent_count: number;
  total_recipients: number;
  created_at: string;
};

export type EventRecord = {
  id: string;
  recipient_email: string;
  type: string;
  occurred_at: string;
  link_url?: string | null;
};

const TYPE_CONFIG: Record<
  string, 
  { label: string; badgeClass: string; icon: typeof CheckCircle2 }
> = {
  sent: { label: "Sent", badgeClass: "bg-accent-blue/15 text-accent-blue border-accent-blue/30", icon: Send },
  delivered: { label: "Delivered", badgeClass: "bg-teal-500/15 text-teal-400 border-teal-500/30", icon: CheckCircle2 },
  opened: { label: "Opened", badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: Eye },
  clicked: { label: "Clicked", badgeClass: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30", icon: MousePointerClick },
  soft_bounce: { label: "Soft Bounce", badgeClass: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: AlertTriangle },
  hard_bounce: { label: "Hard Bounce", badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30", icon: AlertTriangle },
  complaint: { label: "Complaint", badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30", icon: UserX },
  unsubscribed: { label: "Unsubscribed", badgeClass: "bg-muted/20 text-muted border-border", icon: UserX },
  error: { label: "Error", badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30", icon: AlertTriangle },
};

export function CampaignDetailClient({
  campaign,
  events,
}: {
  campaign: CampaignRecord;
  events: EventRecord[];
}) {
  const [activeTab, setActiveTab] = useState<"activity" | "preview">("activity");
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Metrics computation (Mailchimp style)
  const sentCount = campaign.sent_count || campaign.total_recipients || 0;

  // Track unique recipients by activity
  const recipientActivityMap = useMemo(() => {
    const map = new Map<string, {
      email: string;
      latestType: string;
      latestTime: string;
      allEvents: string[];
      hasOpened: boolean;
      hasClicked: boolean;
      hasBounced: boolean;
    }>();

    for (const ev of events) {
      const existing = map.get(ev.recipient_email);
      const isOpened = ev.type === "opened";
      const isClicked = ev.type === "clicked";
      const isBounced = ev.type === "soft_bounce" || ev.type === "hard_bounce";

      if (!existing) {
        map.set(ev.recipient_email, {
          email: ev.recipient_email,
          latestType: ev.type,
          latestTime: ev.occurred_at,
          allEvents: [ev.type],
          hasOpened: isOpened,
          hasClicked: isClicked,
          hasBounced: isBounced,
        });
      } else {
        if (!existing.allEvents.includes(ev.type)) {
          existing.allEvents.push(ev.type);
        }
        if (isOpened) existing.hasOpened = true;
        if (isClicked) existing.hasClicked = true;
        if (isBounced) existing.hasBounced = true;
        // Keep the latest timestamp
        if (new Date(ev.occurred_at) > new Date(existing.latestTime)) {
          existing.latestType = ev.type;
          existing.latestTime = ev.occurred_at;
        }
      }
    }
    return map;
  }, [events]);

  const uniqueOpened = useMemo(() => {
    let count = 0;
    recipientActivityMap.forEach((r) => { if (r.hasOpened) count++; });
    return count;
  }, [recipientActivityMap]);

  const uniqueClicked = useMemo(() => {
    let count = 0;
    recipientActivityMap.forEach((r) => { if (r.hasClicked) count++; });
    return count;
  }, [recipientActivityMap]);

  const bounceCount = useMemo(() => {
    let count = 0;
    recipientActivityMap.forEach((r) => { if (r.hasBounced) count++; });
    return count;
  }, [recipientActivityMap]);

  const deliveredCount = useMemo(() => {
    // If we have explicit delivered events count, else sent minus bounce
    const count = events.filter((e) => e.type === "delivered").length;
    return count > 0 ? count : Math.max(0, sentCount - bounceCount);
  }, [events, sentCount, bounceCount]);

  const openRate = sentCount > 0 ? Math.round((uniqueOpened / sentCount) * 100) : 0;
  const clickRate = sentCount > 0 ? Math.round((uniqueClicked / sentCount) * 100) : 0;
  const deliveryRate = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 100;
  const bounceRate = sentCount > 0 ? ((bounceCount / sentCount) * 100).toFixed(1) : "0.0";

  // Filtered raw events for the log
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch = !searchFilter || e.recipient_email.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [events, searchFilter, typeFilter]);

  const columns: CrmColumn<EventRecord>[] = [
    {
      header: "Recipient",
      cell: (e) => (
        <span className="font-medium text-foreground">{e.recipient_email}</span>
      ),
    },
    {
      header: "Event",
      cell: (e) => {
        const config = TYPE_CONFIG[e.type] || {
          label: e.type,
          badgeClass: "bg-muted/20 text-muted border-border",
          icon: Activity,
        };
        const Icon = config.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass}`}>
            <Icon size={12} />
            {config.label}
          </span>
        );
      },
    },
    {
      header: "Details / Link",
      cell: (e) => {
        if (e.link_url) {
          return (
            <a 
              href={e.link_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-accent-blue hover:underline inline-flex items-center gap-1 max-w-[200px] truncate"
            >
              <ExternalLink size={11} /> {e.link_url}
            </a>
          );
        }
        return <span className="text-xs text-muted">—</span>;
      },
    },
    {
      header: "Occurred At",
      cell: (e) => (
        <span className="text-xs text-muted">
          {new Date(e.occurred_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-3">
        <Link
          href="/crm/campaigns"
          className="text-xs font-semibold text-muted hover:text-foreground inline-flex items-center gap-1.5 w-fit group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Campaigns
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {campaign.subject || "(Untitled Campaign)"}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue border border-accent-blue/20 capitalize">
                {campaign.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted mt-1">
              <span className="inline-flex items-center gap-1">
                <Layers size={13} /> {campaign.kind} Campaign
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar size={13} /> Sent on {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mailchimp-Style Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Delivered Metric */}
        <div className="bg-header/20 border border-border/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Delivered</span>
            <CheckCircle2 size={16} className="text-teal-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{deliveredCount}</span>
              <span className="text-xs text-muted">/ {sentCount} sent</span>
            </div>
            <div className="w-full bg-header/60 rounded-full h-1.5 overflow-hidden mt-2">
              <div
                className="bg-teal-400 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, deliveryRate)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted block mt-1">{deliveryRate}% delivery rate</span>
          </div>
        </div>

        {/* Unique Open Rate */}
        <div className="bg-header/20 border border-border/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Rate</span>
            <Eye size={16} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{openRate}%</span>
              <span className="text-xs text-emerald-400 font-medium">({uniqueOpened} unique)</span>
            </div>
            <div className="w-full bg-header/60 rounded-full h-1.5 overflow-hidden mt-2">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, openRate)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted block mt-1">Industry avg ~21.3%</span>
          </div>
        </div>

        {/* Click-to-Open / Click Rate */}
        <div className="bg-header/20 border border-border/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Click Rate</span>
            <MousePointerClick size={16} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{clickRate}%</span>
              <span className="text-xs text-indigo-400 font-medium">({uniqueClicked} clicks)</span>
            </div>
            <div className="w-full bg-header/60 rounded-full h-1.5 overflow-hidden mt-2">
              <div
                className="bg-indigo-400 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, clickRate)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted block mt-1">Industry avg ~2.6%</span>
          </div>
        </div>

        {/* Bounces & Health */}
        <div className="bg-header/20 border border-border/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Bounce Rate</span>
            <AlertTriangle size={16} className={bounceCount > 0 ? "text-yellow-400" : "text-muted"} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{bounceRate}%</span>
              <span className="text-xs text-muted">({bounceCount} bounced)</span>
            </div>
            <div className="w-full bg-header/60 rounded-full h-1.5 overflow-hidden mt-2">
              <div
                className="bg-yellow-400 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, parseFloat(bounceRate))}%` }}
              />
            </div>
            <span className="text-[11px] text-muted block mt-1">Healthy threshold &lt; 2%</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "activity"
              ? "bg-accent-blue/15 text-accent-blue"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Activity size={14} />
          Recipient Activity ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "preview"
              ? "bg-accent-blue/15 text-accent-blue"
              : "text-muted hover:text-foreground"
          }`}
        >
          <FileText size={14} />
          Email Content Preview
        </button>
      </div>

      {/* Tab 1: Recipient Activity Table */}
      {activeTab === "activity" && (
        <div className="flex flex-col gap-4">
          {/* Controls: Search and Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search recipient email..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-header/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["all", "sent", "delivered", "opened", "clicked", "soft_bounce", "hard_bounce"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                    typeFilter === t
                      ? "bg-foreground text-background"
                      : "bg-header/20 text-muted hover:text-foreground border border-border/70"
                  }`}
                >
                  {t === "all" ? "All Events" : (TYPE_CONFIG[t]?.label || t)}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Table */}
          <div className="bg-header/20 border border-border rounded-2xl p-2 sm:p-4 shadow-xs">
            <ResponsiveTable
              columns={columns}
              rows={filteredEvents}
              emptyLabel={events.length === 0 ? "No webhook events recorded yet for this campaign." : "No events match your filter."}
            />
          </div>
        </div>
      )}

      {/* Tab 2: HTML Email Preview */}
      {activeTab === "preview" && (
        <div className="bg-header/20 border border-border rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="text-xs text-muted">
              Subject: <span className="font-semibold text-foreground">{campaign.subject}</span>
            </div>
          </div>
          {campaign.html ? (
            <div className="bg-white text-black rounded-xl p-6 min-h-[400px] overflow-auto shadow-inner">
              <div 
                dangerouslySetInnerHTML={{ __html: campaign.html }} 
                className="prose max-w-none text-slate-800"
              />
            </div>
          ) : (
            <div className="text-center py-16 text-muted text-sm">
              No HTML body saved for this campaign.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
