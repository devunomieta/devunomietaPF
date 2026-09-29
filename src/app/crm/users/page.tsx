import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { getCrmAuthUser } from "@/lib/crm/auth";
import type { CrmUser, CrmAuditLog } from "@/lib/crm/types";
import { UsersManager } from "./UsersManager";
import { CrmPageGuide } from "@/components/crm/CrmPageGuide";

export const metadata = { title: "Team & User Access · CRM" };
export const dynamic = "force-dynamic";

export default async function CrmUsersPage() {
  const authUser = await getCrmAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  // Only super admin or users with users page permission can see this
  if (!authUser.isSuperAdmin && !authUser.permissions.pages.users) {
    redirect("/crm");
  }

  const adminDb = createAdminClient();

  const [{ data: rawUsers }, { data: permissionsRows }, { data: auditLogs }] = await Promise.all([
    adminDb.from("crm_users").select("*").order("created_at", { ascending: false }),
    adminDb.from("crm_user_permissions").select("user_id, permissions"),
    adminDb.from("crm_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  const permMap = new Map((permissionsRows || []).map((p) => [p.user_id, p.permissions]));

  const users: CrmUser[] = (rawUsers || []).map((u) => ({
    id: u.id,
    auth_user_id: u.auth_user_id,
    email: u.email,
    display_name: u.display_name,
    role_title: u.role_title,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
    permissions: permMap.get(u.id),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Team & User Management</h1>
        <p className="text-xs text-muted mt-0.5">
          Invite assistants, team members, and configure modular access permissions strictly for the CRM.
        </p>
      </div>

      <CrmPageGuide
        pageKey="users"
        title="CRM Team Access & Permission Controls"
        description="Onboard team members (like personal assistants or sales reps) with restricted access exclusively to the CRM system. They are blocked from accessing your website settings or portfolio CMS (/manage)."
        tips={[
          "Use Role Presets (Personal Assistant, Sales, Billing) for instant permission setup.",
          "Restrict sensitive actions like deleting records or viewing financial invoices.",
          "Team members can update their own passwords via their CRM profile modal.",
          "Check the Activity Feed tab to review real-time actions performed by team members.",
        ]}
      />

      <UsersManager
        users={users}
        auditLogs={(auditLogs as CrmAuditLog[]) || []}
        isSuperAdmin={authUser.isSuperAdmin}
        currentUserEmail={authUser.email}
      />
    </div>
  );
}
