"use server";

import {
  getCrmNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  snoozeNotification,
  archiveNotification,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationFilters,
} from "@/lib/crm/notifications";
import { getCrmAuthUser } from "@/lib/crm/auth";
import { revalidatePath } from "next/cache";

export async function fetchNotificationsAction(filters: NotificationFilters = {}) {
  const data = await getCrmNotifications(filters);
  return data;
}

export async function markAsReadAction(id: string) {
  const ok = await markNotificationAsRead(id);
  if (ok) {
    revalidatePath("/crm");
    revalidatePath("/crm/notifications");
  }
  return { success: ok };
}

export async function markAllAsReadAction() {
  const ok = await markAllNotificationsAsRead();
  if (ok) {
    revalidatePath("/crm");
    revalidatePath("/crm/notifications");
  }
  return { success: ok };
}

export async function snoozeAction(id: string, minutes: number) {
  const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  const ok = await snoozeNotification(id, until);
  if (ok) {
    revalidatePath("/crm");
    revalidatePath("/crm/notifications");
  }
  return { success: ok };
}

export async function archiveNotificationAction(id: string) {
  const ok = await archiveNotification(id);
  if (ok) {
    revalidatePath("/crm");
    revalidatePath("/crm/notifications");
  }
  return { success: ok };
}

export async function deleteNotificationAction(id: string) {
  const ok = await deleteNotification(id);
  if (ok) {
    revalidatePath("/crm");
    revalidatePath("/crm/notifications");
  }
  return { success: ok };
}

export async function fetchUserPreferencesAction() {
  const user = await getCrmAuthUser();
  if (!user) return null;
  return await getNotificationPreferences(user.email);
}

export async function saveUserPreferencesAction(prefs: Parameters<typeof updateNotificationPreferences>[1]) {
  const user = await getCrmAuthUser();
  if (!user) return { success: false, error: "Not logged in" };
  const ok = await updateNotificationPreferences(user.email, prefs);
  if (ok) {
    revalidatePath("/crm/settings");
    revalidatePath("/crm/notifications");
  }
  return { success: ok };
}
