"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Layers,
  Copy,
  RotateCcw,
  RefreshCw,
  Users,
  Check,
  Clock,
  XCircle,
  MailX,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { ResponsiveTable, type CrmColumn } from "@/components/crm/ResponsiveTable";
import { BounceCorrectionModal } from "./BounceCorrectionModal";
import { getBouncedRecipientsForCampaign, type BouncedRecipientInfo } from "../actions";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";

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
  const router = useRouter();
  const { toast } = useCrmFeedback();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"recipients" | "activity" | "preview">("recipients");
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [recipientPage, setRecipientPage] = useState(1);
  const pageSize = 20;

  // Bounce resolution state
  const [showBounceModal, setShowBounceModal] = useState(false);
  const [loadingBounces, setLoadingBounces] = useState(false);
  const [bouncedList, setBouncedList] = useState<BouncedRecipientInfo[]>([]);

  useEffect(() => {
    setPage(1);
    setRecipientPage(1);
  }, [searchFilter, typeFilter]);

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
    let count = 0;
    recipientActivityMap.forEach((r) => {
      if (r.allEvents.includes("delivered") || (!r.hasBounced && r.allEvents.includes("sent"))) {
        count++;
      }
    });
    return Math.min(sentCount, Math.max(0, count));
  }, [recipientActivityMap, sentCount]);

  const openRate = sentCount > 0 ? Math.round((uniqueOpened / sentCount) * 100) : 0;
  const clickRate = sentCount > 0 ? Math.round((uniqueClicked / sentCount) * 100) : 0;
  const deliveryRate = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 100;
  const bounceRate = sentCount > 0 ? ((bounceCount / sentCount) * 100).toFixed(1) : "0.0";

  // Segment counts for targeted retargeting
  const unopenedCount = useMemo(() => {
    let count = 0;
    recipientActivityMap.forEach((r) => {
      const isDelivered = r.allEvents.includes("delivered") || (!r.hasBounced && r.allEvents.includes("sent"));
      if (isDelivered && !r.hasOpened && !r.hasBounced) count++;
    });
    return count;
  }, [recipientActivityMap]);

  const openedNoClickCount = useMemo(() => {
    let count = 0;
    recipientActivityMap.forEach((r) => {
      if (r.hasOpened && !r.hasClicked && !r.hasBounced) count++;
    });
    return count;
  }, [recipientActivityMap]);

  const handleOpenBounceModal = async () => {
    setLoadingBounces(true);
    try {
      const res = await getBouncedRecipientsForCampaign(campaign.id);
      if ("error" in res) {
        toast(res.error, "error");
      } else {
        setBouncedList(res.bounces);
        setShowBounceModal(true);
      }
    } catch {
      toast("Could not fetch bounced contacts.", "error");
    } finally {
      setLoadingBounces(false);
    }
  };

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
      mobileStacked: true,
      cell: (e) => (
        <span className="font-semibold text-foreground text-sm block break-all">{e.recipient_email}</span>
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

  // List of unique recipients with aggregated statuses
  const recipientsList = useMemo(() => {
    return Array.from(recipientActivityMap.values()).map((r) => {
      const isDelivered = r.allEvents.includes("delivered") || (!r.hasBounced && r.allEvents.includes("sent"));
      const isSent = r.allEvents.includes("sent");
      return {
        id: r.email,
        email: r.email,
        sent: isSent,
        delivered: isDelivered,
        opened: r.hasOpened,
        clicked: r.hasClicked,
        bounced: r.hasBounced,
        latestTime: r.latestTime,
      };
    });
  }, [recipientActivityMap]);

  const recipientColumns: CrmColumn<typeof recipientsList[0]>[] = [
    {
      header: "Recipient Email",
      mobileStacked: true,
      cell: (r) => (
        <span className="font-semibold text-foreground text-sm block break-all">
          {r.email}
        </span>
      ),
    },
    {
      header: "Delivery",
      cell: (r) => {
        if (r.bounced) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <XCircle size={12} /> Bounced
            </span>
          );
        }
        if (r.delivered) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <Check size={12} /> Delivered
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
            <Clock size={12} /> Sent
          </span>
        );
      },
    },
    {
      header: "Opened",
      cell: (r) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
            r.opened
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-muted/10 text-muted border-border/50"
          }`}
        >
          {r.opened ? <Eye size={12} /> : null}
          {r.opened ? "Yes" : "Not yet"}
        </span>
      ),
    },
    {
      header: "Clicked Link",
      cell: (r) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
            r.clicked
              ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
              : "bg-muted/10 text-muted border-border/50"
          }`}
        >
          {r.clicked ? <MousePointerClick size={12} /> : null}
          {r.clicked ? "Yes" : "No"}
        </span>
      ),
    },
    {
      header: "Last Activity",
      cell: (r) => (
        <span className="text-xs text-muted">
          {new Date(r.latestTime).toLocaleString(undefined, {
            dateStyle: "short",
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
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight break-words">
                {campaign.subject || "(Untitled Campaign)"}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue border border-accent-blue/20 capitalize shrink-0">
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                router.refresh();
                setTimeout(() => setRefreshing(false), 800);
              }}
              title="Refresh tracking data"
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-header/20 hover:bg-header/50 text-muted hover:text-foreground text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-accent-blue" : "text-muted"} />
              Refresh
            </button>
            <Link
              href={`/crm/campaigns/new?duplicateId=${campaign.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-header/20 hover:bg-header/50 text-foreground text-xs font-semibold transition-colors shadow-2xs"
            >
              <Copy size={13} className="text-accent-blue" />
              Duplicate &amp; Edit
            </Link>

            {/* Smart Precision Retargeting Action Buttons */}
            {unopenedCount > 0 && (
              <Link
                href={`/crm/campaigns/new?resendCampaignId=${campaign.id}&resendSegment=unopened`}
                title="Resend email with a fresh subject to recipients who never opened"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25 text-xs font-semibold transition-colors shadow-2xs"
              >
                <RotateCcw size={13} />
                Resend to Unopened ({unopenedCount})
              </Link>
            )}

            {openedNoClickCount > 0 && (
              <Link
                href={`/crm/campaigns/new?resendCampaignId=${campaign.id}&resendSegment=opened_no_click`}
                title="Follow up with interested leads who opened but clicked no links"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/25 text-xs font-semibold transition-colors shadow-2xs"
              >
                <MousePointerClick size={13} />
                Follow-up Non-Clickers ({openedNoClickCount})
              </Link>
            )}

            {bounceCount > 0 && (
              <button
                onClick={handleOpenBounceModal}
                disabled={loadingBounces}
                title="Correct invalid addresses and link to lead or contact profiles"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <Wrench size={13} className={loadingBounces ? "animate-spin" : ""} />
                Fix &amp; Resend Bounces ({bounceCount})
              </button>
            )}

            <Link
              href={`/crm/campaigns/new?duplicateId=${campaign.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-blue text-white hover:bg-accent-blue/90 text-xs font-semibold transition-colors shadow-2xs"
            >
              <RotateCcw size={13} />
              Resend to All
            </Link>
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
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/50 text-[11px]">
              <span className="text-muted">Unopened: {unopenedCount}</span>
              {unopenedCount > 0 && (
                <Link
                  href={`/crm/campaigns/new?resendCampaignId=${campaign.id}&resendSegment=unopened`}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Resend &rarr;
                </Link>
              )}
            </div>
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
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/50 text-[11px]">
              <span className="text-muted">Non-clickers: {openedNoClickCount}</span>
              {openedNoClickCount > 0 && (
                <Link
                  href={`/crm/campaigns/new?resendCampaignId=${campaign.id}&resendSegment=opened_no_click`}
                  className="text-indigo-400 hover:underline font-semibold"
                >
                  Follow up &rarr;
                </Link>
              )}
            </div>
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
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/50 text-[11px]">
              <span className="text-muted">Bounced: {bounceCount}</span>
              {bounceCount > 0 && (
                <button
                  onClick={handleOpenBounceModal}
                  className="text-rose-400 hover:underline font-semibold cursor-pointer"
                >
                  Fix &amp; Resend &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("recipients")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "recipients"
              ? "bg-accent-blue/15 text-accent-blue"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Users size={14} />
          Recipients ({recipientsList.length})
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === "activity"
              ? "bg-accent-blue/15 text-accent-blue"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Activity size={14} />
          Event Stream ({events.length})
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

      {/* Tab 1: Recipients List Table */}
      {activeTab === "recipients" && (
        <div className="flex flex-col gap-4">
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
            <div className="text-xs text-muted">
              Showing {recipientsList.filter(r => !searchFilter || r.email.toLowerCase().includes(searchFilter.toLowerCase())).length} of {recipientsList.length} recipient(s)
            </div>
          </div>

          <div className="bg-header/20 border border-border rounded-2xl p-2 sm:p-4 shadow-xs">
            <ResponsiveTable
              columns={recipientColumns}
              rows={recipientsList.filter(r => !searchFilter || r.email.toLowerCase().includes(searchFilter.toLowerCase()))}
              pageSize={pageSize}
              currentPage={recipientPage}
              onPageChange={setRecipientPage}
              emptyLabel={recipientsList.length === 0 ? "No recipients recorded for this campaign." : "No recipients match your search."}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Recipient Activity Table */}
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
              pageSize={pageSize}
              currentPage={page}
              onPageChange={setPage}
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

      {/* Bounce Correction & Relinking Modal */}
      {showBounceModal && (
        <BounceCorrectionModal
          campaignId={campaign.id}
          bounces={bouncedList}
          onClose={() => setShowBounceModal(false)}
          onRefresh={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
