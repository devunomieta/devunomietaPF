import { redirect } from "next/navigation";
import { getCrmAuthUser } from "@/lib/crm/auth";
import { getCrmNotifications } from "@/lib/crm/notifications";
import { NotificationsManager } from "./NotificationsManager";

export const metadata = {
  title: "Notifications · CRM",
  description: "Monitor and manage system updates, client leads, processes, and real-time CRM reminders.",
};

export const dynamic = "force-dynamic";

export default async function CrmNotificationsPage() {
  const authUser = await getCrmAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  // RBAC Permission Check
  if (!authUser.isSuperAdmin && !authUser.permissions.pages.notifications) {
    redirect("/crm");
  }

  const { notifications, unreadCount } = await getCrmNotifications({
    status: "all",
    limit: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Description */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Notification Center</h1>
        <p className="text-xs text-muted mt-1">
          Review, sort, search, and manage all incoming communications, client activities, system job alerts, and reminders.
        </p>
      </div>

      <NotificationsManager
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
    </div>
  );
}
