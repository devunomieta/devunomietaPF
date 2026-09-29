"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { requireCrmUser, recordCrmAudit } from "@/lib/crm/auth";
import { ROLE_PRESETS } from "@/lib/crm/types";
import type { ActionResult, CrmPermissionsConfig } from "@/lib/crm/types";

/**
 * Super Admin or authorized manager invites / adds a new CRM user.
 */
export async function inviteCrmUser(formData: FormData): Promise<ActionResult> {
  const actor = await requireCrmUser({ page: "users" });
  if (!actor.isSuperAdmin && !actor.permissions.pages.users) {
    return { error: "Only Super Admins can manage CRM users." };
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const displayName = (formData.get("display_name") as string)?.trim();
  const roleTitle = (formData.get("role_title") as string)?.trim() || "Personal Assistant";
  const password = (formData.get("password") as string)?.trim();
  const presetKey = (formData.get("preset") as string) || "assistant";

  if (!email || !displayName) {
    return { error: "Email and Display Name are required." };
  }

  // Parse permissions from form or preset
  let permissionsConfig: CrmPermissionsConfig;
  const customPermissionsJson = formData.get("custom_permissions") as string;
  if (customPermissionsJson) {
    try {
      permissionsConfig = JSON.parse(customPermissionsJson);
    } catch {
      permissionsConfig = ROLE_PRESETS.assistant.permissions;
    }
  } else {
    permissionsConfig = ROLE_PRESETS[presetKey]?.permissions || ROLE_PRESETS.assistant.permissions;
  }

  const adminDb = createAdminClient();

  // Check if crm_users already has this email
  const { data: existingCrmUser } = await adminDb
    .from("crm_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingCrmUser) {
    return { error: `User with email ${email} already exists in CRM.` };
  }

  // Check or create Supabase Auth User
  let authUserId: string | null = null;
  const { data: authUsersList } = await adminDb.auth.admin.listUsers();
  const existingAuthUser = authUsersList?.users?.find((u) => u.email?.toLowerCase() === email);

  if (existingAuthUser) {
    authUserId = existingAuthUser.id;
  } else {
    // Create new Supabase Auth user
    const { data: newAuthUser, error: createAuthError } = await adminDb.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: { full_name: displayName, role_title: roleTitle },
    });

    if (createAuthError) {
      return { error: `Failed to create auth account: ${createAuthError.message}` };
    }
    authUserId = newAuthUser.user.id;
  }

  // Insert into crm_users
  const { data: crmUser, error: insertError } = await adminDb
    .from("crm_users")
    .insert([
      {
        auth_user_id: authUserId,
        email,
        display_name: displayName,
        role_title: roleTitle,
        is_active: true,
      },
    ])
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to create CRM profile: ${insertError.message}` };
  }

  // Insert permissions
  const { error: permError } = await adminDb.from("crm_user_permissions").upsert([
    {
      user_id: crmUser.id,
      permissions: permissionsConfig,
    },
  ]);

  if (permError) {
    return { error: `Failed to save user permissions: ${permError.message}` };
  }

  // Record audit log
  await recordCrmAudit(
    { email: actor.email, name: actor.displayName },
    {
      action: "create",
      entityType: "user",
      entityId: crmUser.id,
      summary: `Onboarded CRM user ${displayName} (${email}) as ${roleTitle}`,
      metadata: { permissions: permissionsConfig },
    }
  );

  revalidatePath("/crm/users");
  return { success: true };
}

/**
 * Update modular permissions for an existing CRM user.
 */
export async function updateCrmUserPermissions(
  userId: string,
  permissions: CrmPermissionsConfig,
  roleTitle?: string
): Promise<ActionResult> {
  const actor = await requireCrmUser({ page: "users" });
  if (!actor.isSuperAdmin && !actor.permissions.pages.users) {
    return { error: "Only Super Admins can update permissions." };
  }

  const adminDb = createAdminClient();

  const { error: permError } = await adminDb
    .from("crm_user_permissions")
    .upsert([{ user_id: userId, permissions, updated_at: new Date().toISOString() }]);

  if (permError) return { error: permError.message };

  if (roleTitle) {
    await adminDb
      .from("crm_users")
      .update({ role_title: roleTitle, updated_at: new Date().toISOString() })
      .eq("id", userId);
  }

  await recordCrmAudit(
    { email: actor.email, name: actor.displayName },
    {
      action: "update",
      entityType: "user",
      entityId: userId,
      summary: `Updated modular permissions for user`,
      metadata: { permissions },
    }
  );

  revalidatePath("/crm/users");
  return { success: true };
}

/**
 * Toggle user active status (deactivate or reactivate assistant access).
 */
export async function toggleCrmUserStatus(userId: string, isActive: boolean): Promise<ActionResult> {
  const actor = await requireCrmUser({ page: "users" });
  if (!actor.isSuperAdmin && !actor.permissions.pages.users) {
    return { error: "Only Super Admins can deactivate users." };
  }

  const adminDb = createAdminClient();
  const { error } = await adminDb
    .from("crm_users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };

  await recordCrmAudit(
    { email: actor.email, name: actor.displayName },
    {
      action: "update",
      entityType: "user",
      entityId: userId,
      summary: `${isActive ? "Activated" : "Suspended"} user account access`,
    }
  );

  revalidatePath("/crm/users");
  return { success: true };
}

/**
 * Permanently delete a CRM team member.
 */
export async function deleteCrmUser(userId: string): Promise<ActionResult> {
  const actor = await requireCrmUser({ page: "users" });
  if (!actor.isSuperAdmin) {
    return { error: "Only Super Admins can delete CRM user accounts." };
  }

  const adminDb = createAdminClient();
  const { data: userRow } = await adminDb.from("crm_users").select("email, display_name").eq("id", userId).maybeSingle();

  const { error } = await adminDb.from("crm_users").delete().eq("id", userId);
  if (error) return { error: error.message };

  await recordCrmAudit(
    { email: actor.email, name: actor.displayName },
    {
      action: "delete",
      entityType: "user",
      entityId: userId,
      summary: `Removed CRM user ${userRow?.display_name || ""} (${userRow?.email || userId})`,
    }
  );

  revalidatePath("/crm/users");
  return { success: true };
}

/**
 * Allows the currently logged-in user to update their own password from within the CRM.
 */
export async function updateMyPassword(newPassword: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  await recordCrmAudit(
    { email: user.email || "unknown", name: user.user_metadata?.full_name },
    {
      action: "update",
      entityType: "user",
      summary: "Updated account access password",
    }
  );

  return { success: true };
}
