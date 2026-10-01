"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, Volume2, VolumeX, Smartphone, Mail, Shield, Check, Loader2 } from "lucide-react";
import { crmPrimaryBtnClass } from "@/components/crm/CrmModal";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import {
  fetchUserPreferencesAction,
  saveUserPreferencesAction,
} from "@/app/crm/notifications/actions";
import { playNotificationChime } from "@/lib/crm/audio";
import type { CrmNotificationPreferences, CrmNotificationCategory } from "@/lib/crm/types";

export function NotificationPreferencesSection() {
  const { toast } = useCrmFeedback();
  const [prefs, setPrefs] = useState<CrmNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushStatus(Notification.permission);
    }
    fetchUserPreferencesAction().then((data) => {
      if (data) setPrefs(data);
      setLoading(false);
    });
  }, []);

  const handleToggleSound = () => {
    if (!prefs) return;
    const next = !prefs.sound_enabled;
    setPrefs({ ...prefs, sound_enabled: next });
    localStorage.setItem("crm_notification_sound", String(next));
    if (next) playNotificationChime("info");
  };

  const handleRequestPush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast("Browser notifications are not supported in this environment.", "error");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission === "granted") {
        if (prefs) {
          setPrefs({ ...prefs, browser_push_enabled: true });
        }
        toast("Browser notifications enabled successfully!", "success");
      } else {
        toast("Browser notifications permission was not granted.", "error");
      }
    } catch (e: any) {
      toast(`Failed to request permission: ${e.message}`, "error");
    }
  };

  const handleToggleCategory = (cat: CrmNotificationCategory) => {
    if (!prefs) return;
    const current = prefs.category_toggles[cat] ?? true;
    setPrefs({
      ...prefs,
      category_toggles: {
        ...prefs.category_toggles,
        [cat]: !current,
      },
    });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    const res = await saveUserPreferencesAction({
      sound_enabled: prefs.sound_enabled,
      browser_push_enabled: prefs.browser_push_enabled,
      category_toggles: prefs.category_toggles,
    });
    setSaving(false);
    if (res.success) {
      toast("Notification preferences saved!", "success");
    } else {
      toast("Could not save preferences", "error");
    }
  };

  if (loading) {
    return (
      <div className="bg-header/20 border border-border rounded-xl p-5 flex items-center justify-center gap-2 text-xs text-muted">
        <Loader2 size={16} className="animate-spin text-accent-blue" />
        <span>Loading notification preferences...</span>
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="bg-header/20 border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Bell size={15} className="text-accent-blue" />
            <span>Notification & Alert Channels</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Personalize audio chimes, browser push alerts, and category filtering for your account.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
        {/* Sound Toggle */}
        <div className="p-3 rounded-lg border border-border bg-header/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {prefs.sound_enabled ? (
              <Volume2 size={18} className="text-accent-blue" />
            ) : (
              <VolumeX size={18} className="text-muted" />
            )}
            <div>
              <p className="text-xs font-semibold text-foreground">Acoustic Chime</p>
              <p className="text-[10px] text-muted">Plays subtle tone on new events</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleSound}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              prefs.sound_enabled
                ? "bg-accent-blue text-white"
                : "bg-header/60 text-muted hover:text-foreground"
            }`}
          >
            {prefs.sound_enabled ? "Enabled" : "Muted"}
          </button>
        </div>

        {/* Browser Web Push */}
        <div className="p-3 rounded-lg border border-border bg-header/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone size={18} className="text-accent-blue" />
            <div>
              <p className="text-xs font-semibold text-foreground">Browser Push</p>
              <p className="text-[10px] text-muted">
                Status: <strong className="capitalize">{pushStatus}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRequestPush}
            disabled={pushStatus === "granted"}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              pushStatus === "granted"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-accent-blue text-white hover:bg-accent-blue/90"
            }`}
          >
            {pushStatus === "granted" ? "Granted" : "Enable Push"}
          </button>
        </div>
      </div>

      {/* Category Subscriptions */}
      <div className="pt-2">
        <h3 className="text-xs font-semibold text-foreground mb-2">Category Alert Subscriptions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(
            [
              ["lead", "Leads"],
              ["client", "Clients"],
              ["mailbox", "Mailbox"],
              ["whatsapp", "WhatsApp"],
              ["campaign", "Campaigns"],
              ["monitoring", "Jobs & Monitoring"],
              ["invoice", "Invoices"],
              ["finance", "Finance"],
              ["system", "System Events"],
            ] as const
          ).map(([key, label]) => {
            const isChecked = prefs.category_toggles[key] ?? true;
            return (
              <label
                key={key}
                className="flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-header/30 cursor-pointer text-xs hover:border-accent-blue/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleCategory(key as CrmNotificationCategory)}
                  className="rounded border-border text-accent-blue focus:ring-0 cursor-pointer"
                />
                <span className={isChecked ? "text-foreground font-medium" : "text-muted"}>
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`${crmPrimaryBtnClass} self-start mt-2`}
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        Save Notification Preferences
      </button>
    </div>
  );
}
