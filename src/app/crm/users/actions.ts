"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { requireCrmUser, recordCrmAudit } from "@/lib/crm/auth";
import { ROLE_PRESETS } from "@/lib/crm/types";
import type { ActionResult, CrmPermissionsConfig } from "@/lib/crm/types";
import { sendEmail } from "@/lib/brevo";
import { assistantOnboardingAgreementEmail } from "@/lib/email-templates";
import { 
  AGREEMENT_VERSION, 
  AGREEMENT_TITLE, 
  CANONICAL_AGREEMENT_TERMS, 
  getAgreementTermsHash, 
  PRINCIPAL_NAME, 
  PRINCIPAL_TITLE 
} from "@/lib/crm/agreements/agreementText";

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

  // Insert into crm_users with agreement_status = 'pending'
  const { data: crmUser, error: insertError } = await adminDb
    .from("crm_users")
    .insert([
      {
        auth_user_id: authUserId,
        email,
        display_name: displayName,
        role_title: roleTitle,
        is_active: true,
        agreement_status: "pending",
      },
    ])
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to create CRM profile: ${insertError.message}` };
  }

  // Insert initial pending agreement record with terms hash
  const termsHash = getAgreementTermsHash();
  const { error: agreementError } = await adminDb.from("crm_team_agreements").insert([
    {
      user_id: crmUser.id,
      auth_user_id: authUserId,
      version: AGREEMENT_VERSION,
      title: AGREEMENT_TITLE,
      terms_hash: termsHash,
      terms_text: CANONICAL_AGREEMENT_TERMS,
      status: "pending",
      principal_name: PRINCIPAL_NAME,
      principal_title: PRINCIPAL_TITLE,
    },
  ]);

  if (agreementError) {
    console.error("Warning: Could not create agreement record:", agreementError.message);
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

  // Send onboarding email with credentials & agreement preview
  try {
    const headerList = await headers();
    const host = headerList.get("host") || "devunomieta.xyz";
    const proto = host.includes("localhost") ? "http" : "https";
    const loginUrl = `${proto}://${host}/login`;

    const htmlContent = assistantOnboardingAgreementEmail({
      name: displayName,
      email,
      tempPassword: password || undefined,
      roleTitle,
      loginUrl,
    });

    await sendEmail({
      to: [{ email, name: displayName }],
      subject: `Welcome to the Team, ${displayName} - Assistant Agreement & Account Setup`,
      htmlContent,
    });
  } catch (emailErr) {
    console.error("Error dispatching onboarding email:", emailErr);
  }

  // Record audit log
  await recordCrmAudit(
    { email: actor.email, name: actor.displayName },
    {
      action: "create",
      entityType: "user",
      entityId: crmUser.id,
      summary: `Onboarded CRM user ${displayName} (${email}) as ${roleTitle} with pending Agreement & NDA`,
      metadata: { permissions: permissionsConfig, agreement_version: AGREEMENT_VERSION },
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
  const { data: userRow } = await adminDb
    .from("crm_users")
    .select("email, display_name, auth_user_id")
    .eq("id", userId)
    .maybeSingle();

  // Delete CRM user record first (cascades permissions & agreements)
  const { error } = await adminDb.from("crm_users").delete().eq("id", userId);
  if (error) return { error: error.message };

  // If there's an associated auth user, delete it in background / non-blocking so response is fast
  if (userRow?.auth_user_id) {
    adminDb.auth.admin.deleteUser(userRow.auth_user_id).catch((err) => {
      console.error("Warning: could not delete auth account:", err);
    });
  }

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

/**
 * First-login mandatory electronic signing action for team assistants.
 */
export async function signAgreementAction(data: {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  termsAccepted: boolean;
}): Promise<ActionResult> {
  const actor = await requireCrmUser({ skipAgreementCheck: true });
  if (actor.isSuperAdmin) {
    return { success: true };
  }

  const { firstName, lastName, dateOfBirth, termsAccepted } = data;
  if (!termsAccepted) {
    return { error: "You must accept the terms of the Agreement and NDA to proceed." };
  }

  const trimmedFirst = firstName?.trim();
  const trimmedLast = lastName?.trim();
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!trimmedFirst || !trimmedLast) {
    return { error: "Legal First Name and Last Name are required." };
  }

  if (!dateOfBirth || !dobRegex.test(dateOfBirth)) {
    return { error: "Please enter a valid Date of Birth (YYYY-MM-DD)." };
  }

  // Calculate age verification (must be at least 18 from today)
  const birthDate = new Date(dateOfBirth + "T00:00:00");
  if (isNaN(birthDate.getTime())) {
    return { error: "Please enter a valid Date of Birth." };
  }
  const today = new Date();
  let calculatedAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    calculatedAge--;
  }

  if (calculatedAge < 18) {
    return { error: "You must be at least 18 years of age to enter into this legal agreement." };
  }

  // Telemetry extraction
  const headerList = await headers();
  const ipAddress = 
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
    headerList.get("x-real-ip") || 
    "127.0.0.1";
  const userAgent = headerList.get("user-agent") || "Unknown Browser / Client";

  const adminDb = createAdminClient();
  const signedAt = new Date().toISOString();

  // Find user's pending agreement
  const { data: agreementRow } = await adminDb
    .from("crm_team_agreements")
    .select("id, version")
    .eq("user_id", actor.crmUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (agreementRow) {
    await adminDb
      .from("crm_team_agreements")
      .update({
        first_name: trimmedFirst,
        last_name: trimmedLast,
        date_of_birth: dateOfBirth,
        signed_at: signedAt,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_summary: userAgent.slice(0, 80),
        status: "signed",
        updated_at: signedAt,
      })
      .eq("id", agreementRow.id);
  } else {
    // Fallback create agreement row
    const termsHash = getAgreementTermsHash();
    await adminDb.from("crm_team_agreements").insert([
      {
        user_id: actor.crmUserId,
        version: AGREEMENT_VERSION,
        title: AGREEMENT_TITLE,
        terms_hash: termsHash,
        terms_text: CANONICAL_AGREEMENT_TERMS,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        date_of_birth: dateOfBirth,
        signed_at: signedAt,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_summary: userAgent.slice(0, 80),
        status: "signed",
        principal_name: PRINCIPAL_NAME,
        principal_title: PRINCIPAL_TITLE,
      },
    ]);
  }

  // Update crm_users status to 'signed'
  await adminDb
    .from("crm_users")
    .update({
      agreement_status: "signed",
      agreement_signed_at: signedAt,
      display_name: `${trimmedFirst} ${trimmedLast}`,
      updated_at: signedAt,
    })
    .eq("id", actor.crmUserId);

  await recordCrmAudit(
    { email: actor.email, name: `${trimmedFirst} ${trimmedLast}` },
    {
      action: "sign_agreement",
      entityType: "agreement",
      entityId: actor.crmUserId,
      summary: `Digitally executed and sealed Personal Assistant Agreement & NDA (${trimmedFirst} ${trimmedLast})`,
      metadata: { ip: ipAddress, userAgent, signedAt, dob: dateOfBirth },
    }
  );

  revalidatePath("/crm");
  return { success: true };
}

/**
 * Super Admin requests re-signature / revokes current signed agreement.
 */
export async function requestReSignatureAction(userId: string): Promise<ActionResult> {
  const actor = await requireCrmUser({ page: "users" });
  if (!actor.isSuperAdmin) {
    return { error: "Only Super Admins can request agreement re-signature." };
  }

  const adminDb = createAdminClient();
  const termsHash = getAgreementTermsHash();

  // Create a new pending agreement entry
  await adminDb.from("crm_team_agreements").insert([
    {
      user_id: userId,
      version: AGREEMENT_VERSION,
      title: AGREEMENT_TITLE,
      terms_hash: termsHash,
      terms_text: CANONICAL_AGREEMENT_TERMS,
      status: "pending",
      principal_name: PRINCIPAL_NAME,
      principal_title: PRINCIPAL_TITLE,
    },
  ]);

  // Set user agreement_status to 'pending'
  await adminDb
    .from("crm_users")
    .update({
      agreement_status: "pending",
      agreement_signed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  await recordCrmAudit(
    { email: actor.email, name: actor.displayName },
    {
      action: "request_re_signature",
      entityType: "agreement",
      entityId: userId,
      summary: `Requested contract re-signature / revoked agreement for user ${userId}`,
    }
  );

  revalidatePath("/crm/users");
  return { success: true };
}

