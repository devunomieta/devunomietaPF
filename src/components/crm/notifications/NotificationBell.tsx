"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Volume2,
  VolumeX,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  Loader2,
  Inbox,
  Users,
  UserPlus,
  Mail,
  MessageCircle,
  Activity,
  Receipt,
  Wallet,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import {
  fetchNotificationsAction,
  markAsReadAction,
  markAllAsReadAction,
  snoozeAction,
} from "@/app/crm/notifications/actions";
import { playNotificationChime } from "@/lib/crm/audio";
import type { CrmNotification, CrmNotificationCategory, CrmNotificationSeverity } from "@/lib/crm/types";

const CATEGORY_ICONS: Record<string, any> = {
  lead: UserPlus,
  client: Users,
  mailbox: Inbox,
  whatsapp: MessageCircle,
  campaign: Mail,
  monitoring: Activity,
  invoice: Receipt,
  finance: Wallet,
  system: SlidersHorizontal,
  user: Shield,
};

const SEVERITY_COLORS: Record<CrmNotificationSeverity, { badge: string; text: string; bg: string }> = {
  critical: { badge: "bg-red-500/20 text-red-400 border-red-500/30", text: "text-red-400", bg: "bg-red-500" },
  warning: { badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", text: "text-amber-400", bg: "bg-amber-500" },
  success: { badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", text: "text-emerald-400", bg: "bg-emerald-500" },
  info: { badge: "bg-accent-blue/20 text-accent-blue border-accent-blue/30", text: "text-accent-blue", bg: "bg-accent-blue" },
};

export function NotificationBell({ initialCount = 0 }: { initialCount?: number }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Load sound setting from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("crm_notification_sound");
    if (saved !== null) {
      setSoundEnabled(saved === "true");
    }
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("crm_notification_sound", String(next));
    if (next) {
      playNotificationChime("info");
    }
  };

  // Fetch unread count & recent list
  const loadData = async (shouldSoundOnIncrease = false) => {
    try {
      const res = await fetchNotificationsAction({ limit: 8, status: "all" });
      if (res) {
        if (shouldSoundOnIncrease && soundEnabled && res.unreadCount > unreadCount) {
          playNotificationChime("info");
        }
        setUnreadCount(res.unreadCount);
        setNotifications(res.notifications);
      }
    } catch (e) {
      console.warn("Could not poll notifications:", e);
    }
  };

  // Initial fetch and auto-polling every 20 seconds
  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => {
      loadData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [soundEnabled, unreadCount]);

  const handleOpenDropdown = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setLoading(true);
      fetchNotificationsAction({ limit: 8, status: "all" }).then((res) => {
        setUnreadCount(res.unreadCount);
        setNotifications(res.notifications);
        setLoading(false);
      });
    }
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllAsReadAction();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    });
  };

  const handleItemClick = async (notif: CrmNotification) => {
    if (!notif.is_read) {
      await markAsReadAction(notif.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    setIsOpen(false);
    if (notif.link_url) {
      router.push(notif.link_url);
    }
  };

  const handleSnooze = async (e: React.MouseEvent, id: string, minutes: number) => {
    e.stopPropagation();
    await snoozeAction(id, minutes);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  // Get most critical severity among unread
  const hasCritical = notifications.some((n) => !n.is_read && n.severity === "critical");
  const hasWarning = notifications.some((n) => !n.is_read && n.severity === "warning");

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="crm-notification-bell-btn"
        aria-label="Notifications"
        onClick={handleOpenDropdown}
        className={`relative p-2 rounded-lg border transition-all duration-200 flex items-center justify-center ${
          isOpen
            ? "bg-accent-blue/15 border-accent-blue text-accent-blue"
            : "border-border/70 bg-header/40 hover:bg-header/70 text-muted hover:text-foreground"
        }`}
        title="CRM Notifications"
      >
        <Bell size={16} className={unreadCount > 0 ? "animate-pulse" : ""} />

        {/* Counter Badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] text-[10px] font-black rounded-full text-white flex items-center justify-center shadow-lg transition-transform ${
              hasCritical
                ? "bg-red-500 animate-bounce"
                : hasWarning
                ? "bg-amber-500"
                : "bg-accent-blue"
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Dropdown Menu */}
      {isOpen && (
        <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-24px)] sm:w-96 max-w-sm rounded-xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Dropdown Header */}
          <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between bg-header/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs tracking-wide uppercase text-foreground">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  soundEnabled
                    ? "text-accent-blue hover:bg-accent-blue/10"
                    : "text-muted hover:text-foreground"
                }`}
                title={soundEnabled ? "Mute notification sounds" : "Enable notification sounds"}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>

              {/* Mark all read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="p-1.5 rounded-md text-xs text-muted hover:text-foreground hover:bg-header/50 transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span className="text-[10px] hidden sm:inline">Mark read</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification List Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted text-xs">
                <Loader2 size={18} className="animate-spin text-accent-blue" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-muted px-4">
                <Bell size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">All caught up!</p>
                <p className="text-[11px] text-muted/80 mt-0.5">
                  No notifications to display right now.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const CategoryIcon = CATEGORY_ICONS[notif.category] || Info;
                const severity = notif.severity || "info";
                const sevConfig = SEVERITY_COLORS[severity];

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`group px-3.5 py-3 flex gap-3 text-left transition-colors cursor-pointer ${
                      notif.is_read
                        ? "bg-transparent hover:bg-header/40 opacity-75 hover:opacity-100"
                        : "bg-accent-blue/[0.04] hover:bg-accent-blue/[0.08]"
                    }`}
                  >
                    {/* Icon */}
                    <div className="relative mt-0.5 shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-header/60 border border-border flex items-center justify-center text-foreground group-hover:border-accent-blue/50 transition-colors">
                        <CategoryIcon size={14} className={sevConfig.text} />
                      </div>
                      {!notif.is_read && (
                        <span
                          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${sevConfig.bg}`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            notif.is_read ? "text-foreground/80" : "text-foreground"
                          }`}
                        >
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-muted shrink-0 whitespace-nowrap">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Footer Actions / Snooze in dropdown */}
                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span
                          className={`px-1.5 py-0.2 rounded border uppercase font-bold text-[9px] ${sevConfig.badge}`}
                        >
                          {notif.category}
                        </span>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Quick Snooze 30m */}
                          <button
                            type="button"
                            onClick={(e) => handleSnooze(e, notif.id, 30)}
                            className="text-muted hover:text-accent-blue flex items-center gap-0.5"
                            title="Snooze for 30 minutes"
                          >
                            <Clock size={11} />
                            <span>30m</span>
                          </button>

                          {notif.link_url && (
                            <span className="text-accent-blue flex items-center gap-0.5 font-medium">
                              <span>Open</span>
                              <ExternalLink size={10} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer CTA */}
          <div className="p-2.5 bg-header/40 border-t border-border/70 text-center">
            <Link
              href="/crm/notifications"
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-accent-blue hover:bg-accent-blue/15 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View all in Notification Center</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "";
  }
}
