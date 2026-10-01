"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Trash2,
  Archive,
  Volume2,
  VolumeX,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Loader2,
  Users,
  UserPlus,
  Mail,
  MessageCircle,
  Activity,
  Receipt,
  Wallet,
  Shield,
  Inbox,
  RefreshCw,
} from "lucide-react";
import {
  fetchNotificationsAction,
  markAsReadAction,
  markAllAsReadAction,
  snoozeAction,
  archiveNotificationAction,
  deleteNotificationAction,
} from "./actions";
import { playNotificationChime } from "@/lib/crm/audio";
import type {
  CrmNotification,
  CrmNotificationCategory,
  CrmNotificationSeverity,
} from "@/lib/crm/types";

const CATEGORIES: { key: string; label: string; icon: any }[] = [
  { key: "all", label: "All Categories", icon: Bell },
  { key: "lead", label: "Leads", icon: UserPlus },
  { key: "client", label: "Clients", icon: Users },
  { key: "mailbox", label: "Mailbox", icon: Inbox },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "campaign", label: "Campaigns", icon: Mail },
  { key: "monitoring", label: "Monitoring / Jobs", icon: Activity },
  { key: "invoice", label: "Invoices", icon: Receipt },
  { key: "finance", label: "Finance", icon: Wallet },
  { key: "system", label: "System", icon: SlidersHorizontal },
  { key: "user", label: "Security & Team", icon: Shield },
];

const SEVERITIES: { key: string; label: string }[] = [
  { key: "all", label: "All Severities" },
  { key: "critical", label: "Critical" },
  { key: "warning", label: "Warning" },
  { key: "success", label: "Success" },
  { key: "info", label: "Info" },
];

const SEVERITY_CONFIG: Record<
  CrmNotificationSeverity,
  { label: string; badge: string; text: string; bg: string; icon: any }
> = {
  critical: {
    label: "CRITICAL",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    text: "text-red-400",
    bg: "bg-red-500",
    icon: AlertCircle,
  },
  warning: {
    label: "WARNING",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    text: "text-amber-400",
    bg: "bg-amber-500",
    icon: AlertTriangle,
  },
  success: {
    label: "SUCCESS",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500",
    icon: CheckCircle2,
  },
  info: {
    label: "INFO",
    badge: "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
    text: "text-accent-blue",
    bg: "bg-accent-blue",
    icon: Info,
  },
};

export function NotificationsManager({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: CrmNotification[];
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<CrmNotification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isPending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);

  // Filters & State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "unread" | "read" | "snoozed">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "severity" | "category">("newest");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Metrics
  const stats = useMemo(() => {
    const unread = notifications.filter((n) => !n.is_read).length;
    const critical = notifications.filter((n) => n.severity === "critical").length;
    const warnings = notifications.filter((n) => n.severity === "warning").length;
    const snoozed = notifications.filter((n) => n.snoozed_until && new Date(n.snoozed_until) > new Date()).length;
    return { unread, critical, warnings, snoozed, total: notifications.length };
  }, [notifications]);

  // Client-side filtering & sorting
  const filteredNotifications = useMemo(() => {
    let list = [...notifications];

    // Status
    if (selectedStatus === "unread") {
      list = list.filter((n) => !n.is_read);
    } else if (selectedStatus === "read") {
      list = list.filter((n) => n.is_read);
    } else if (selectedStatus === "snoozed") {
      list = list.filter((n) => n.snoozed_until && new Date(n.snoozed_until) > new Date());
    }

    // Category
    if (selectedCategory !== "all") {
      list = list.filter((n) => n.category === selectedCategory);
    }

    // Severity
    if (selectedSeverity !== "all") {
      list = list.filter((n) => n.severity === selectedSeverity);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.actor_name && n.actor_name.toLowerCase().includes(q)) ||
          (n.entity_id && n.entity_id.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "category") {
        return a.category.localeCompare(b.category);
      }
      if (sortBy === "severity") {
        const order: Record<CrmNotificationSeverity, number> = {
          critical: 4,
          warning: 3,
          success: 2,
          info: 1,
        };
        return order[b.severity] - order[a.severity];
      }
      // default: newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [notifications, selectedStatus, selectedCategory, selectedSeverity, search, sortBy]);

  // Actions
  const reloadData = async () => {
    setRefreshing(true);
    try {
      const res = await fetchNotificationsAction({
        status: "all",
        category: "all",
      });
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    });
  };

  const handleSnooze = async (id: string, minutes: number) => {
    await snoozeAction(id, minutes);
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, snoozed_until: until } : n))
    );
  };

  const handleDelete = async (id: string) => {
    await deleteNotificationAction(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleArchive = async (id: string) => {
    await archiveNotificationAction(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkMarkRead = async () => {
    for (const id of selectedIds) {
      await markAsReadAction(id);
    }
    setNotifications((prev) =>
      prev.map((n) => (selectedIds.has(n.id) ? { ...n, is_read: true } : n))
    );
    setSelectedIds(new Set());
    setUnreadCount((c) => Math.max(0, c - selectedIds.size));
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteNotificationAction(id);
    }
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header / Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border/80 bg-header/20 flex flex-col justify-between">
          <span className="text-xs text-muted font-medium">Unread Alerts</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-foreground">{stats.unread}</span>
            <span className="text-[10px] text-muted">/ {stats.total} total</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col justify-between">
          <span className="text-xs text-red-400 font-medium flex items-center gap-1.5">
            <AlertCircle size={14} />
            <span>Critical Events</span>
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-400">{stats.critical}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col justify-between">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Warnings</span>
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-400">{stats.warnings}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-header/20 flex flex-col justify-between">
          <span className="text-xs text-muted font-medium flex items-center gap-1.5">
            <Clock size={14} />
            <span>Snoozed Reminders</span>
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-foreground">{stats.snoozed}</span>
          </div>
        </div>
      </div>

      {/* Main Filter Toolbar */}
      <div className="rounded-xl border border-border/80 bg-header/20 p-4 space-y-4">
        {/* Row 1: Search + Status Tabs + Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications, messages, actors, or IDs..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:border-accent-blue text-foreground placeholder:text-muted/60"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-header/40 p-1 rounded-lg border border-border/60 shrink-0">
            {(["all", "unread", "read", "snoozed"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                  selectedStatus === st
                    ? "bg-accent-blue text-white shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-header/60"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reloadData}
              disabled={refreshing}
              className="p-2 rounded-lg border border-border hover:border-accent-blue/50 bg-background text-muted hover:text-foreground text-xs flex items-center gap-1.5 transition-colors"
              title="Refresh notifications"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>

            {stats.unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="px-3 py-2 rounded-lg border border-accent-blue/40 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <CheckCheck size={14} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Category & Severity Filters + Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs">
          {/* Category Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted text-[11px] font-medium flex items-center gap-1">
              <Filter size={12} />
              <span>Category:</span>
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:border-accent-blue"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Severity Dropdown */}
            <span className="text-muted text-[11px] font-medium ml-2">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:border-accent-blue"
            >
              {SEVERITIES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-muted text-[11px] font-medium flex items-center gap-1">
              <ArrowUpDown size={12} />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:border-accent-blue"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="severity">Highest Severity</option>
              <option value="category">Category (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Banner (when items selected) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-accent-blue/30 bg-accent-blue/10 animate-in fade-in">
          <span className="text-xs font-semibold text-accent-blue">
            {selectedIds.size} notification{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkMarkRead}
              className="px-3 py-1 rounded-md bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition-colors flex items-center gap-1"
            >
              <Check size={13} />
              <span>Mark as Read</span>
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notification Table / List */}
      <div className="rounded-xl border border-border/80 bg-header/10 overflow-hidden divide-y divide-border/50">
        {/* Table Head */}
        <div className="p-3 bg-header/40 flex items-center justify-between text-xs text-muted font-medium">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                filteredNotifications.length > 0 &&
                selectedIds.size === filteredNotifications.length
              }
              onChange={toggleSelectAll}
              className="rounded border-border text-accent-blue focus:ring-0 cursor-pointer"
            />
            <span>
              Showing {filteredNotifications.length} notification
              {filteredNotifications.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Empty State */}
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-muted">
            <Bell size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-foreground/80">No notifications found</p>
            <p className="text-xs text-muted/70 mt-1 max-w-sm mx-auto">
              There are no notifications matching your current filters. Try resetting the category or search criteria.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isSelected = selectedIds.has(notif.id);
            const sev = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
            const SevIcon = sev.icon;
            const isSnoozed =
              notif.snoozed_until && new Date(notif.snoozed_until) > new Date();

            return (
              <div
                key={notif.id}
                className={`group p-4 flex items-start gap-4 transition-colors ${
                  isSelected
                    ? "bg-accent-blue/10"
                    : notif.is_read
                    ? "bg-background/40 hover:bg-header/30 opacity-80 hover:opacity-100"
                    : "bg-accent-blue/[0.04] hover:bg-accent-blue/[0.08]"
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelectOne(notif.id)}
                  className="mt-1 rounded border-border text-accent-blue focus:ring-0 cursor-pointer"
                />

                {/* Severity Icon Box */}
                <div
                  className={`mt-0.5 w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${sev.badge}`}
                >
                  <SevIcon size={16} className={sev.text} />
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-bold ${
                          notif.is_read ? "text-foreground/80" : "text-foreground"
                        }`}
                      >
                        {notif.title}
                      </h3>
                      {notif.group_count > 1 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-accent-blue text-white text-[9px] font-black">
                          x{notif.group_count}
                        </span>
                      )}
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                      )}
                      {isSnoozed && (
                        <span className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                          <Clock size={11} />
                          <span>Snoozed</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-muted whitespace-nowrap">
                      {formatFullDate(notif.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed mb-3">
                    {notif.message}
                  </p>

                  {/* Metadata Tags & Deep Links */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded border border-border/70 bg-header/50 text-[10px] font-semibold uppercase text-muted tracking-wider">
                        {notif.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${sev.badge}`}
                      >
                        {sev.label}
                      </span>
                      {notif.actor_name && (
                        <span className="text-[10px] text-muted">
                          Triggered by: <strong className="text-foreground/80">{notif.actor_name}</strong>
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Deep Link Navigation */}
                      {notif.link_url && (
                        <Link
                          href={notif.link_url}
                          onClick={() => {
                            if (!notif.is_read) handleMarkAsRead(notif.id);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-accent-blue/40 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue font-semibold text-xs flex items-center gap-1 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink size={11} />
                        </Link>
                      )}

                      {/* Snooze Dropdown */}
                      <div className="relative group/snooze">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg border border-border hover:border-amber-500/40 text-muted hover:text-amber-400 text-xs flex items-center gap-1 transition-colors"
                          title="Snooze reminder"
                        >
                          <Clock size={13} />
                        </button>
                        <div className="absolute right-0 bottom-full mb-1 hidden group-hover/snooze:flex flex-col bg-background border border-border rounded-lg shadow-xl p-1 z-30 min-w-[120px]">
                          <button
                            type="button"
                            onClick={() => handleSnooze(notif.id, 30)}
                            className="px-2 py-1 text-left text-[11px] text-muted hover:text-foreground hover:bg-header/50 rounded"
                          >
                            Snooze 30m
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSnooze(notif.id, 120)}
                            className="px-2 py-1 text-left text-[11px] text-muted hover:text-foreground hover:bg-header/50 rounded"
                          >
                            Snooze 2h
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSnooze(notif.id, 1440)}
                            className="px-2 py-1 text-left text-[11px] text-muted hover:text-foreground hover:bg-header/50 rounded"
                          >
                            Tomorrow
                          </button>
                        </div>
                      </div>

                      {/* Mark read / unread */}
                      {!notif.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-1.5 rounded-lg border border-border hover:border-accent-blue/40 text-muted hover:text-accent-blue text-xs transition-colors"
                          title="Mark as read"
                        >
                          <Check size={13} />
                        </button>
                      )}

                      {/* Archive */}
                      <button
                        type="button"
                        onClick={() => handleArchive(notif.id)}
                        className="p-1.5 rounded-lg border border-border hover:border-muted text-muted hover:text-foreground text-xs transition-colors"
                        title="Archive notification"
                      >
                        <Archive size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDelete(notif.id)}
                        className="p-1.5 rounded-lg border border-border hover:border-red-500/40 text-muted hover:text-red-400 text-xs transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatFullDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}
