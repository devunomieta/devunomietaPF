import { createAdminClient } from "@/utils/supabase/admin";
import { getCrmAuthUser, type AuthenticatedCrmUser } from "./auth";
import type {
  CrmNotification,
  CrmNotificationCategory,
  CrmNotificationSeverity,
  CrmPagesPermission,
  CrmNotificationPreferences,
} from "./types";

export type CreateNotificationInput = {
  title: string;
  message: string;
  category: CrmNotificationCategory;
  severity?: CrmNotificationSeverity;
  link_url?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  required_page_permission?: keyof CrmPagesPermission | null;
  target_role?: string | null;
  user_id?: string | null;
  group_key?: string | null;
  actor_email?: string | null;
  actor_name?: string | null;
};

export type NotificationFilters = {
  category?: string;
  severity?: string;
  status?: "all" | "unread" | "read" | "snoozed";
  search?: string;
  sortBy?: "newest" | "oldest" | "severity" | "category";
  limit?: number;
  offset?: number;
};

/**
 * Dispatch a CRM Notification with deduplication & smart grouping.
 */
export async function createCrmNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const adminDb = createAdminClient();

    // 1. Smart Grouping & Deduplication (Recommendation 3)
    if (input.group_key) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: existingGroup } = await adminDb
        .from("crm_notifications")
        .select("id, group_count, message")
        .eq("group_key", input.group_key)
        .gte("created_at", fifteenMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingGroup) {
        const nextCount = (existingGroup.group_count || 1) + 1;
        const { error: updateErr } = await adminDb
          .from("crm_notifications")
          .update({
            group_count: nextCount,
            title: input.title,
            message: `${input.message} (+${nextCount - 1} grouped events)`,
            is_read: false,
            read_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingGroup.id);

        if (!updateErr) {
          return { success: true, id: existingGroup.id };
        }
      }
    }

    // 2. Insert new notification row
    const { data, error } = await adminDb
      .from("crm_notifications")
      .insert([
        {
          title: input.title,
          message: input.message,
          category: input.category,
          severity: input.severity || "info",
          link_url: input.link_url || null,
          entity_type: input.entity_type || null,
          entity_id: input.entity_id || null,
          metadata: input.metadata || {},
          required_page_permission: input.required_page_permission || null,
          target_role: input.target_role || "all",
          user_id: input.user_id || null,
          group_key: input.group_key || null,
          actor_email: input.actor_email || null,
          actor_name: input.actor_name || null,
          is_read: false,
          is_archived: false,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.warn("Could not insert crm_notification (table might need creation in DB):", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("Error creating crm notification:", err);
    return { success: false, error: err?.message || "Failed to create notification" };
  }
}

/**
 * Check if the active user is authorized to view a notification based on RBAC.
 */
export function isUserAuthorizedForNotification(
  authUser: AuthenticatedCrmUser,
  notif: Partial<CrmNotification>
): boolean {
  if (authUser.isSuperAdmin) return true;

  // Specific user recipient
  if (notif.user_id && notif.user_id !== authUser.crmUserId) {
    return false;
  }

  // Target role check
  if (notif.target_role && notif.target_role !== "all") {
    if (notif.target_role === "superadmin" && !authUser.isSuperAdmin) {
      return false;
    }
  }

  // Required module permission check
  if (notif.required_page_permission) {
    const pageKey = notif.required_page_permission as keyof CrmPagesPermission;
    if (!authUser.permissions?.pages?.[pageKey]) {
      return false;
    }
  }

  return true;
}

/**
 * Fetch notifications for current user with filtering, sorting, and RBAC scoping.
 */
export async function getCrmNotifications(
  filters: NotificationFilters = {}
): Promise<{ notifications: CrmNotification[]; unreadCount: number }> {
  try {
    const authUser = await getCrmAuthUser();
    if (!authUser) {
      return { notifications: [], unreadCount: 0 };
    }

    const adminDb = createAdminClient();

    let query = adminDb
      .from("crm_notifications")
      .select("*")
      .eq("is_archived", false);

    // Filter by category
    if (filters.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }

    // Filter by severity
    if (filters.severity && filters.severity !== "all") {
      query = query.eq("severity", filters.severity);
    }

    // Filter by read/unread/snoozed status
    const nowIso = new Date().toISOString();
    if (filters.status === "unread") {
      query = query.eq("is_read", false);
    } else if (filters.status === "read") {
      query = query.eq("is_read", true);
    } else if (filters.status === "snoozed") {
      query = query.not("snoozed_until", "is", null).gt("snoozed_until", nowIso);
    }

    // Sorting
    if (filters.sortBy === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else if (filters.sortBy === "category") {
      query = query.order("category", { ascending: true }).order("created_at", { ascending: false });
    } else if (filters.sortBy === "severity") {
      // Postgres enum order or client-side sort
      query = query.order("severity", { ascending: false }).order("created_at", { ascending: false });
    } else {
      // default: newest
      query = query.order("created_at", { ascending: false });
    }

    const limit = filters.limit || 50;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.warn("Unable to fetch crm_notifications from DB:", error.message);
      return { notifications: [], unreadCount: 0 };
    }

    const allRows = (data || []) as CrmNotification[];

    // RBAC Filter in application layer
    const authorized = allRows.filter((notif) => isUserAuthorizedForNotification(authUser, notif));

    // Handle text search filter in memory for instant high-speed matching
    let filtered = authorized;
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.actor_name && n.actor_name.toLowerCase().includes(q)) ||
        (n.entity_id && n.entity_id.toLowerCase().includes(q))
      );
    }

    // Calculate unread count (excluding actively snoozed ones)
    const unreadCount = authorized.filter((n) => {
      if (n.is_read) return false;
      if (n.snoozed_until && new Date(n.snoozed_until) > new Date()) return false;
      return true;
    }).length;

    return { notifications: filtered, unreadCount };
  } catch (err) {
    console.error("Error fetching CRM notifications:", err);
    return { notifications: [], unreadCount: 0 };
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const authUser = await getCrmAuthUser();
    if (!authUser) return false;

    const adminDb = createAdminClient();
    const { error } = await adminDb
      .from("crm_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: authUser.email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return !error;
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
    return false;
  }
}

/**
 * Mark all notifications as read for current user scope.
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const authUser = await getCrmAuthUser();
    if (!authUser) return false;

    const adminDb = createAdminClient();
    const { error } = await adminDb
      .from("crm_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: authUser.email,
        updated_at: new Date().toISOString(),
      })
      .eq("is_read", false);

    return !error;
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
    return false;
  }
}

/**
 * Snooze a notification (Recommendation 2).
 */
export async function snoozeNotification(
  id: string,
  untilIso: string
): Promise<boolean> {
  try {
    const adminDb = createAdminClient();
    const { error } = await adminDb
      .from("crm_notifications")
      .update({
        snoozed_until: untilIso,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return !error;
  } catch (err) {
    console.error("Failed to snooze notification:", err);
    return false;
  }
}

/**
 * Archive a notification.
 */
export async function archiveNotification(id: string): Promise<boolean> {
  try {
    const adminDb = createAdminClient();
    const { error } = await adminDb
      .from("crm_notifications")
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return !error;
  } catch (err) {
    console.error("Failed to archive notification:", err);
    return false;
  }
}

/**
 * Delete a notification permanently.
 */
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    const authUser = await getCrmAuthUser();
    if (!authUser) return false;

    const adminDb = createAdminClient();
    const { error } = await adminDb
      .from("crm_notifications")
      .delete()
      .eq("id", id);

    return !error;
  } catch (err) {
    console.error("Failed to delete notification:", err);
    return false;
  }
}

/**
 * Get user notification preferences (Recommendation 4).
 */
export async function getNotificationPreferences(
  email: string
): Promise<CrmNotificationPreferences> {
  const defaultPrefs: CrmNotificationPreferences = {
    user_email: email,
    sound_enabled: true,
    browser_push_enabled: false,
    push_subscription: null,
    email_digest_enabled: false,
    email_digest_frequency: "daily",
    category_toggles: {
      lead: true,
      client: true,
      mailbox: true,
      whatsapp: true,
      campaign: true,
      monitoring: true,
      invoice: true,
      finance: true,
      system: true,
      user: true,
    },
    updated_at: new Date().toISOString(),
  };

  try {
    const adminDb = createAdminClient();
    const { data } = await adminDb
      .from("crm_notification_preferences")
      .select("*")
      .eq("user_email", email)
      .maybeSingle();

    if (data) {
      return {
        ...defaultPrefs,
        ...data,
      };
    }
  } catch (err) {
    console.warn("Could not query crm_notification_preferences:", err);
  }

  return defaultPrefs;
}

/**
 * Update user notification preferences (Recommendation 4).
 */
export async function updateNotificationPreferences(
  email: string,
  updates: Partial<CrmNotificationPreferences>
): Promise<boolean> {
  try {
    const adminDb = createAdminClient();
    const { error } = await adminDb
      .from("crm_notification_preferences")
      .upsert(
        {
          user_email: email,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_email" }
      );

    return !error;
  } catch (err) {
    console.error("Failed to update notification preferences:", err);
    return false;
  }
}
