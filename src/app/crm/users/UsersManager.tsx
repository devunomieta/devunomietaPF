"use client";

import { useState } from "react";
import { 
  UserPlus, 
  Shield, 
  Check, 
  Trash2, 
  Power, 
  Loader2, 
  Users, 
  Key, 
  Settings2,
  Clock,
  Sparkles,
  FileText,
  Download,
  ExternalLink,
  RefreshCw,
  Info,
  Calendar,
  ShieldCheck,
  Mail,
  UserCheck
} from "lucide-react";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "@/components/crm/CrmModal";
import { CrmTooltip } from "@/components/crm/CrmTooltip";
import { useCrmFeedback } from "@/components/crm/CrmFeedbackProvider";
import { ROLE_PRESETS } from "@/lib/crm/types";
import type { CrmUser, CrmPermissionsConfig, CrmAuditLog } from "@/lib/crm/types";
import { 
  inviteCrmUser, 
  updateCrmUserPermissions, 
  toggleCrmUserStatus, 
  deleteCrmUser,
  requestReSignatureAction
} from "./actions";

const PAGE_KEYS: Array<{ key: keyof CrmPermissionsConfig["pages"]; label: string; desc: string }> = [
  { key: "dashboard", label: "Dashboard", desc: "View high-level CRM metrics & pipeline overview" },
  { key: "clients", label: "Clients", desc: "View client profiles, details, and activity" },
  { key: "leads", label: "Leads", desc: "View leads and pipeline stage progression" },
  { key: "journeys", label: "Journeys", desc: "Configure sales stages and journey pipelines" },
  { key: "campaigns", label: "Campaigns", desc: "Email marketing, newsletters, and analytics" },
  { key: "mailbox", label: "Mailbox", desc: "Gmail-like unified email inbox and reply threads" },
  { key: "whatsapp", label: "WhatsApp", desc: "Direct messaging, chat logs, and template outreach" },
  { key: "invoices", label: "Invoices", desc: "View billing, invoices, and payments" },
  { key: "finance", label: "Finance", desc: "Revenue metrics, cash flow, and financial health" },
  { key: "import", label: "Import", desc: "CSV importing for bulk leads and clients" },
  { key: "monitoring", label: "Monitoring", desc: "Background job logs and system performance" },
  { key: "settings", label: "Settings", desc: "CRM invoice branding and GreenAPI credentials" },
  { key: "users", label: "Team Users", desc: "Manage team accounts and permissions" },
];

const ACTION_KEYS: Array<{ key: keyof CrmPermissionsConfig["actions"]; label: string; desc: string }> = [
  { key: "clients_edit", label: "Edit Clients", desc: "Allow creating and modifying client profiles" },
  { key: "clients_delete", label: "Delete Clients", desc: "Allow deleting client records permanently" },
  { key: "leads_edit", label: "Edit Leads", desc: "Allow creating, modifying, and moving leads" },
  { key: "leads_delete", label: "Delete Leads", desc: "Allow deleting lead records permanently" },
  { key: "invoices_create", label: "Create Invoices", desc: "Allow generating invoices & recording payments" },
  { key: "invoices_delete", label: "Delete / Void Invoices", desc: "Allow deleting or voiding billing invoices" },
  { key: "campaigns_send", label: "Send Campaigns", desc: "Allow initiating email campaigns to audiences" },
  { key: "whatsapp_send", label: "Send WhatsApp", desc: "Allow sending WhatsApp direct messages to contacts" },
  { key: "mailbox_send", label: "Send & Reply Emails", desc: "Allow replying to threads and composing emails in Mailbox" },
];

export function UsersManager({
  users,
  auditLogs,
  isSuperAdmin,
  currentUserEmail,
}: {
  users: CrmUser[];
  auditLogs: CrmAuditLog[];
  isSuperAdmin: boolean;
  currentUserEmail: string;
}) {
  const { toast, confirm } = useCrmFeedback();
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users");

  // Invite Modal State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("assistant");
  const [customPerms, setCustomPerms] = useState<CrmPermissionsConfig>(ROLE_PRESETS.assistant.permissions);

  // Edit Permissions Modal State
  const [editingUser, setEditingUser] = useState<CrmUser | null>(null);
  const [editPerms, setEditPerms] = useState<CrmPermissionsConfig | null>(null);
  const [editRoleTitle, setEditRoleTitle] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // User Details Modal State
  const [selectedUserDetail, setSelectedUserDetail] = useState<CrmUser | null>(null);

  // Handle Preset Selection
  function handlePresetChange(presetKey: string) {
    setSelectedPreset(presetKey);
    if (ROLE_PRESETS[presetKey]) {
      setCustomPerms(JSON.parse(JSON.stringify(ROLE_PRESETS[presetKey].permissions)));
    }
  }

  // Toggle Page Permission in Invite Modal
  function toggleInvitePage(page: keyof CrmPermissionsConfig["pages"]) {
    setSelectedPreset("custom");
    setCustomPerms((prev) => ({
      ...prev,
      pages: { ...prev.pages, [page]: !prev.pages[page] },
    }));
  }

  // Toggle Action Permission in Invite Modal
  function toggleInviteAction(action: keyof CrmPermissionsConfig["actions"]) {
    setSelectedPreset("custom");
    setCustomPerms((prev) => ({
      ...prev,
      actions: { ...prev.actions, [action]: !prev.actions[action] },
    }));
  }

  // Handle Invite Form Submit
  async function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("custom_permissions", JSON.stringify(customPerms));

    const result = await inviteCrmUser(formData);
    setInviteLoading(false);

    if ("success" in result) {
      toast("Team member successfully added!", "success");
      setInviteOpen(false);
    } else {
      toast(result.error);
    }
  }

  // Open Edit Modal
  function openEditModal(u: CrmUser) {
    setEditingUser(u);
    setEditRoleTitle(u.role_title);
    setEditPerms(u.permissions ? JSON.parse(JSON.stringify(u.permissions)) : JSON.parse(JSON.stringify(ROLE_PRESETS.assistant.permissions)));
  }

  // Save Edited Permissions
  async function handleSaveEditedPermissions() {
    if (!editingUser || !editPerms) return;
    setEditLoading(true);
    const result = await updateCrmUserPermissions(editingUser.id, editPerms, editRoleTitle);
    setEditLoading(false);

    if ("success" in result) {
      toast("Permissions updated successfully!", "success");
      setEditingUser(null);
    } else {
      toast(result.error);
    }
  }

  // Toggle Status
  async function handleToggleStatus(u: CrmUser) {
    const nextState = !u.is_active;
    const promptMsg = nextState 
      ? `Reactivate CRM access for ${u.display_name}?` 
      : `Suspend CRM access for ${u.display_name}? They will not be able to log in.`;
    
    if (!(await confirm(promptMsg, { confirmLabel: nextState ? "Reactivate" : "Suspend", danger: !nextState }))) return;

    const result = await toggleCrmUserStatus(u.id, nextState);
    if ("success" in result) {
      toast(`User account ${nextState ? "reactivated" : "suspended"}.`, "success");
    } else {
      toast(result.error);
    }
  }

  // Delete User
  async function handleDeleteUser(u: CrmUser) {
    if (!(await confirm(`Permanently remove ${u.display_name} (${u.email}) from CRM users?`, { danger: true, confirmLabel: "Delete User" }))) return;

    const result = await deleteCrmUser(u.id);
    if ("success" in result) {
      toast("User removed from CRM.", "success");
    } else {
      toast(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Action & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 border-b border-border sm:border-0 pb-2 sm:pb-0">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "users"
                ? "bg-accent-blue/15 text-accent-blue"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Users size={14} /> Team Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "audit"
                ? "bg-accent-blue/15 text-accent-blue"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Clock size={14} /> Activity Feed ({auditLogs.length})
          </button>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInviteOpen(true)}
              className={crmPrimaryBtnClass}
              id="btn-add-crm-user"
            >
              <UserPlus size={15} />
              Add Team Member
            </button>
            <CrmTooltip text="Add assistants or managers with restricted, modular access to the CRM only." />
          </div>
        )}
      </div>

      {/* Tab 1: User Accounts Table */}
      {activeTab === "users" && (
        <div className="bg-header/20 border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-header/40 text-muted uppercase tracking-wider font-semibold border-b border-border/80">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Agreement &amp; NDA</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground/90">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      No assistant or team accounts added yet. Click &quot;Add Team Member&quot; to onboard someone.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const pageCount = u.permissions 
                      ? Object.values(u.permissions.pages).filter(Boolean).length 
                      : 0;
                    const canDeleteRecs = u.permissions?.actions.clients_delete || u.permissions?.actions.leads_delete;
                    const agreementSigned = u.agreement_status === "signed" || u.agreement?.status === "signed";
                    const agreementId = u.agreement?.id;

                    return (
                      <tr 
                        key={u.id} 
                        onClick={() => setSelectedUserDetail(u)}
                        className="hover:bg-header/40 cursor-pointer transition-colors group"
                        title="Click to view complete member profile, agreements & telemetry"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground group-hover:text-accent-blue transition-colors flex items-center gap-1.5">
                            {u.display_name}
                            {u.email === currentUserEmail && (
                              <span className="text-[10px] bg-accent-blue/15 text-accent-blue px-1.5 py-0.5 rounded">You</span>
                            )}
                          </div>
                          <div className="text-muted text-[11px]">{u.email}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground/80">
                          {u.role_title}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              u.is_active
                                ? "bg-accent-green/15 text-accent-green border-accent-green/30"
                                : "bg-red-400/15 text-red-400 border-red-400/30"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-accent-green" : "bg-red-400"}`} />
                            {u.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  agreementSigned
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                }`}
                              >
                                {agreementSigned ? "✓ Signed & Sealed" : "⏳ Pending Consent"}
                              </span>
                              {agreementSigned && u.agreement?.signed_at && (
                                <span className="text-[10px] text-muted">
                                  {new Date(u.agreement.signed_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {agreementId && (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`/api/crm/agreements/${agreementId}/download?preview=true`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-0.5 rounded text-[11px] font-medium border border-border/80 hover:bg-header/50 text-foreground/90 flex items-center gap-1 transition-colors"
                                  title="Preview Agreement Document"
                                >
                                  <ExternalLink size={11} className="text-accent-blue" />
                                  <span>Preview</span>
                                </a>
                                <a
                                  href={`/api/crm/agreements/${agreementId}/download`}
                                  download
                                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue border border-accent-blue/30 flex items-center gap-1 transition-colors"
                                  title="Download Signed Agreement PDF"
                                >
                                  <Download size={11} />
                                  <span>Download PDF</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-header/50 border border-border/80 px-2 py-0.5 rounded text-[11px]">
                              {pageCount} of {PAGE_KEYS.length} pages
                            </span>
                            {canDeleteRecs ? (
                              <span className="text-red-400 text-[10px] bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">
                                Can Delete
                              </span>
                            ) : (
                              <span className="text-muted text-[10px] bg-header/40 px-1.5 py-0.5 rounded">
                                No Delete
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setSelectedUserDetail(u)}
                              className="p-1.5 text-muted hover:text-foreground rounded transition-colors"
                              title="View details"
                              aria-label="View details"
                            >
                              <Info size={15} />
                            </button>
                            {isSuperAdmin && agreementSigned && (
                              <button
                                onClick={async () => {
                                  if (
                                    !(await confirm(
                                      `Revoke existing agreement and require ${u.display_name} to re-sign on their next login?`,
                                      { danger: true, confirmLabel: "Request Re-Signature" }
                                    ))
                                  )
                                    return;
                                  const res = await requestReSignatureAction(u.id);
                                  if ("success" in res) {
                                    toast("Re-signature requested. User must sign on next login.", "success");
                                  } else {
                                    toast(res.error);
                                  }
                                }}
                                className="p-1.5 text-muted hover:text-amber-500 rounded transition-colors"
                                title="Request contract re-signature"
                                aria-label="Request contract re-signature"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-muted hover:text-accent-blue rounded transition-colors"
                              title="Edit permissions"
                              aria-label="Edit permissions"
                            >
                              <Settings2 size={15} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded transition-colors ${
                                u.is_active ? "text-muted hover:text-yellow-400" : "text-muted hover:text-accent-green"
                              }`}
                              title={u.is_active ? "Suspend access" : "Reactivate access"}
                              aria-label={u.is_active ? "Suspend access" : "Reactivate access"}
                            >
                              <Power size={15} />
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-muted hover:text-red-400 rounded transition-colors"
                                title="Delete user"
                                aria-label="Delete user"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Activity Audit Stream */}
      {activeTab === "audit" && (
        <div className="bg-header/20 border border-border rounded-xl p-4 sm:p-5 flex flex-col gap-3">
          <div className="text-xs text-muted mb-1">
            Real-time chronological log of actions taken by CRM users and assistants.
          </div>
          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-muted text-xs">
              No recorded activity yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{log.actor_name}</span>
                      <span className="text-[10px] text-muted">({log.actor_email})</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-header/60 border border-border/60 text-muted">
                        {log.action} • {log.entity_type}
                      </span>
                    </div>
                    <p className="text-foreground/80 mt-0.5">{log.summary}</p>
                  </div>
                  <span className="text-[11px] text-muted shrink-0">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Invite / Add Team Member */}
      <CrmModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Onboard New Team Member"
        widthClassName="max-w-2xl"
      >
        <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={crmLabelClass} htmlFor="display_name">Full Name *</label>
              <input id="display_name" name="display_name" required className={crmInputClass} placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <label className={crmLabelClass} htmlFor="email">Email Address *</label>
              <input id="email" name="email" type="email" required className={crmInputClass} placeholder="jane@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={crmLabelClass} htmlFor="role_title">Role Title</label>
              <input id="role_title" name="role_title" defaultValue="Personal Assistant" className={crmInputClass} />
            </div>
            <div>
              <label className={crmLabelClass} htmlFor="password">Initial Password</label>
              <input id="password" name="password" type="password" minLength={6} placeholder="Min 6 chars (or set later)" className={crmInputClass} />
            </div>
          </div>

          {/* Role Presets Selector */}
          <div className="pt-2 border-t border-border">
            <label className={crmLabelClass}>Permission Preset</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
              {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    selectedPreset === key
                      ? "bg-accent-blue/15 border-accent-blue text-accent-blue"
                      : "bg-header/20 border-border text-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-xs font-bold block">{preset.label}</span>
                  <span className="text-[10px] text-muted line-clamp-2 mt-1">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Modular Permissions Grid */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Shield size={13} className="text-accent-blue" />
                  Allowed Pages
                </span>
                <span className="text-[11px] text-muted">Toggle individual page access</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAGE_KEYS.map((p) => {
                  const active = customPerms.pages[p.key];
                  return (
                    <button
                      type="button"
                      key={p.key}
                      onClick={() => toggleInvitePage(p.key)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between text-xs ${
                        active
                          ? "bg-accent-blue/10 border-accent-blue/60 text-foreground"
                          : "bg-header/10 border-border/50 text-muted opacity-60"
                      }`}
                    >
                      <span className="font-medium">{p.label}</span>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        active ? "bg-accent-blue text-white border-accent-blue" : "border-border"
                      }`}>
                        {active && <Check size={11} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Key size={13} className="text-yellow-400" />
                  Sensitive Operations
                </span>
                <span className="text-[11px] text-muted">Restrict high-risk changes</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACTION_KEYS.map((a) => {
                  const active = customPerms.actions[a.key];
                  return (
                    <button
                      type="button"
                      key={a.key}
                      onClick={() => toggleInviteAction(a.key)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between text-xs ${
                        active
                          ? "bg-accent-blue/10 border-accent-blue/60 text-foreground"
                          : "bg-header/10 border-border/50 text-muted opacity-60"
                      }`}
                    >
                      <div>
                        <span className="font-medium block">{a.label}</span>
                        <span className="text-[10px] text-muted block">{a.desc}</span>
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ml-2 ${
                        active ? "bg-accent-blue text-white border-accent-blue" : "border-border"
                      }`}>
                        {active && <Check size={11} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
            <button type="button" onClick={() => setInviteOpen(false)} className={crmSecondaryBtnClass}>
              Cancel
            </button>
            <button type="submit" disabled={inviteLoading} className={crmPrimaryBtnClass}>
              {inviteLoading && <Loader2 size={14} className="animate-spin" />}
              Create Team Account
            </button>
          </div>
        </form>
      </CrmModal>

      {/* MODAL 2: Edit Permissions */}
      {editingUser && editPerms && (
        <CrmModal
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Edit Permissions: ${editingUser.display_name}`}
          widthClassName="max-w-2xl"
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className={crmLabelClass} htmlFor="edit_role">Role Title</label>
              <input
                id="edit_role"
                value={editRoleTitle}
                onChange={(e) => setEditRoleTitle(e.target.value)}
                className={crmInputClass}
              />
            </div>

            {/* Pages */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <Shield size={13} className="text-accent-blue" />
                Allowed Pages
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAGE_KEYS.map((p) => {
                  const active = editPerms.pages[p.key];
                  return (
                    <button
                      type="button"
                      key={p.key}
                      onClick={() =>
                        setEditPerms((prev) =>
                          prev ? { ...prev, pages: { ...prev.pages, [p.key]: !prev.pages[p.key] } } : prev
                        )
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between text-xs ${
                        active
                          ? "bg-accent-blue/10 border-accent-blue/60 text-foreground"
                          : "bg-header/10 border-border/50 text-muted opacity-60"
                      }`}
                    >
                      <span className="font-medium">{p.label}</span>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        active ? "bg-accent-blue text-white border-accent-blue" : "border-border"
                      }`}>
                        {active && <Check size={11} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <Key size={13} className="text-yellow-400" />
                Sensitive Operations
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACTION_KEYS.map((a) => {
                  const active = editPerms.actions[a.key];
                  return (
                    <button
                      type="button"
                      key={a.key}
                      onClick={() =>
                        setEditPerms((prev) =>
                          prev ? { ...prev, actions: { ...prev.actions, [a.key]: !prev.actions[a.key] } } : prev
                        )
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between text-xs ${
                        active
                          ? "bg-accent-blue/10 border-accent-blue/60 text-foreground"
                          : "bg-header/10 border-border/50 text-muted opacity-60"
                      }`}
                    >
                      <div>
                        <span className="font-medium block">{a.label}</span>
                        <span className="text-[10px] text-muted block">{a.desc}</span>
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ml-2 ${
                        active ? "bg-accent-blue text-white border-accent-blue" : "border-border"
                      }`}>
                        {active && <Check size={11} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
              <button type="button" onClick={() => setEditingUser(null)} className={crmSecondaryBtnClass}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedPermissions}
                disabled={editLoading}
                className={crmPrimaryBtnClass}
              >
                {editLoading && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </CrmModal>
      )}

      {/* Modal 3: User Profile & Signed Agreement Dossier Review */}
      {selectedUserDetail && (
        <CrmModal
          open={!!selectedUserDetail}
          onClose={() => setSelectedUserDetail(null)}
          title={`Team Member: ${selectedUserDetail.display_name}`}
        >
          <div className="flex flex-col gap-4 text-xs">
            {/* Identity Card */}
            <div className="bg-header/30 border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">{selectedUserDetail.display_name}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      selectedUserDetail.is_active
                        ? "bg-accent-green/15 text-accent-green border-accent-green/30"
                        : "bg-red-400/15 text-red-400 border-red-400/30"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedUserDetail.is_active ? "bg-accent-green" : "bg-red-400"}`} />
                    {selectedUserDetail.is_active ? "Active" : "Suspended"}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                  <Mail size={12} /> {selectedUserDetail.email}
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Member since {new Date(selectedUserDetail.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue border border-accent-blue/30 capitalize">
                  {selectedUserDetail.role_title}
                </span>
                <span className="text-[11px] text-muted">
                  ID: {selectedUserDetail.id.slice(0, 13)}...
                </span>
              </div>
            </div>

            {/* Agreement & Legal Consent Status */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Assistant Agreement & Perpetual NDA</h4>
                    <p className="text-[11px] text-muted">15% Net Profit Share · Perpetual Confidentiality</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    selectedUserDetail.agreement_status === "signed" || selectedUserDetail.agreement?.status === "signed"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  {selectedUserDetail.agreement_status === "signed" || selectedUserDetail.agreement?.status === "signed"
                    ? "✓ Legally Signed & Sealed"
                    : "⏳ Pending User Consent"}
                </span>
              </div>

              {selectedUserDetail.agreement && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
                  <div>
                    <span className="text-muted block">Contract Version:</span>
                    <span className="font-semibold text-foreground">{selectedUserDetail.agreement.version}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Execution Date:</span>
                    <span className="font-semibold text-foreground">
                      {selectedUserDetail.agreement.signed_at 
                        ? new Date(selectedUserDetail.agreement.signed_at).toLocaleString() 
                        : "Awaiting execution"}
                    </span>
                  </div>
                  {isSuperAdmin && selectedUserDetail.agreement.date_of_birth && (
                    <div>
                      <span className="text-muted block">Date of Birth (Protected):</span>
                      <span className="font-semibold text-foreground">{selectedUserDetail.agreement.date_of_birth}</span>
                    </div>
                  )}
                  {selectedUserDetail.agreement.ip_address && (
                    <div>
                      <span className="text-muted block">Signing IP Address:</span>
                      <span className="font-mono text-foreground">{selectedUserDetail.agreement.ip_address}</span>
                    </div>
                  )}
                  {selectedUserDetail.agreement.device_summary && (
                    <div className="sm:col-span-2">
                      <span className="text-muted block">Signing Device Telemetry:</span>
                      <span className="text-foreground/90">{selectedUserDetail.agreement.device_summary}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons for Agreement */}
              {selectedUserDetail.agreement?.id && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <a
                    href={`/api/crm/agreements/${selectedUserDetail.agreement.id}/download?preview=true`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-header/50 text-foreground flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink size={13} className="text-accent-blue" />
                    <span>Preview Agreement Copy</span>
                  </a>
                  <a
                    href={`/api/crm/agreements/${selectedUserDetail.agreement.id}/download`}
                    download
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/90 flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download size={13} />
                    <span>Download Signed PDF</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modular Permissions Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-accent-blue" />
                Active Modular Permissions
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PAGE_KEYS.map((p) => {
                  const allowed = selectedUserDetail.permissions?.pages[p.key];
                  return (
                    <div
                      key={p.key}
                      className={`p-2 rounded border text-[11px] flex items-center justify-between ${
                        allowed ? "bg-accent-blue/5 border-accent-blue/30 text-foreground" : "bg-muted/10 border-border/40 text-muted opacity-50"
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="font-bold">{allowed ? "✓" : "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="flex justify-between items-center gap-2 mt-2 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const u = selectedUserDetail;
                    setSelectedUserDetail(null);
                    openEditModal(u);
                  }}
                  className={crmSecondaryBtnClass}
                >
                  <Settings2 size={13} />
                  <span>Permissions</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className={crmPrimaryBtnClass}
              >
                Close Details
              </button>
            </div>
          </div>
        </CrmModal>
      )}
    </div>
  );
}
