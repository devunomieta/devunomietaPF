import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { SUPER_ADMIN_PERMISSIONS, ROLE_PRESETS } from "./types";
import type { CrmPermissionsConfig } from "./types";

export type AuthenticatedCrmUser = {
  email: string;
  isSuperAdmin: boolean;
  crmUserId?: string;
  displayName: string;
  roleTitle: string;
  permissions: CrmPermissionsConfig;
};

/**
 * Validates whether the logged in user has access to the CRM.
 * Checks public.admins first (Super Admin), then public.crm_users.
 */
export async function getCrmAuthUser(): Promise<AuthenticatedCrmUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const email = user.email.toLowerCase();
  const adminDb = createAdminClient();

  // 1. Check Super Admin (public.admins)
  const { data: superAdmin } = await adminDb
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (superAdmin) {
    return {
      email,
      isSuperAdmin: true,
      displayName: user.user_metadata?.full_name || email.split("@")[0],
      roleTitle: "Super Admin",
      permissions: SUPER_ADMIN_PERMISSIONS,
    };
  }

  // 2. Check CRM Team User (public.crm_users)
  const { data: crmUser } = await adminDb
    .from("crm_users")
    .select("id, email, display_name, role_title, is_active")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();

  if (!crmUser) return null;

  // Fetch permissions
  const { data: permRow } = await adminDb
    .from("crm_user_permissions")
    .select("permissions")
    .eq("user_id", crmUser.id)
    .maybeSingle();

  const permissions: CrmPermissionsConfig = permRow?.permissions || ROLE_PRESETS.assistant.permissions;

  return {
    email,
    isSuperAdmin: false,
    crmUserId: crmUser.id,
    displayName: crmUser.display_name,
    roleTitle: crmUser.role_title || "Assistant",
    permissions,
  };
}

/**
 * Server action guard: requires active CRM user or Super Admin.
 */
export async function requireCrmUser(requiredPermission?: {
  page?: keyof CrmPermissionsConfig["pages"];
  action?: keyof CrmPermissionsConfig["actions"];
}) {
  const authUser = await getCrmAuthUser();
  if (!authUser) {
    throw new Error("Unauthorized: Access denied to CRM.");
  }

  if (authUser.isSuperAdmin) {
    return authUser;
  }

  if (requiredPermission?.page && !authUser.permissions.pages[requiredPermission.page]) {
    throw new Error(`Unauthorized: You do not have permission to access the ${requiredPermission.page} page.`);
  }

  if (requiredPermission?.action && !authUser.permissions.actions[requiredPermission.action]) {
    throw new Error(`Unauthorized: You do not have permission to perform this action.`);
  }

  return authUser;
}

/**
 * Record an entry into public.crm_audit_logs.
 */
export async function recordCrmAudit(
  actor: { email: string; name?: string },
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    const adminDb = createAdminClient();
    await adminDb.from("crm_audit_logs").insert([
      {
        actor_email: actor.email,
        actor_name: actor.name || actor.email.split("@")[0],
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId || null,
        summary: entry.summary,
        metadata: entry.metadata || {},
      },
    ]);
  } catch (err) {
    console.error("Failed to write CRM audit log:", err);
  }
}
