"use client";

import { useState } from "react";
import { KeyRound, Loader2, CheckCircle2, AlertTriangle, FileText, Download, ExternalLink } from "lucide-react";
import { CrmModal, crmInputClass, crmLabelClass, crmPrimaryBtnClass, crmSecondaryBtnClass } from "./CrmModal";
import { updateMyPassword } from "@/app/crm/users/actions";

export function CrmProfileModal({
  open,
  onClose,
  userEmail,
  displayName,
  roleTitle,
  agreementId,
  agreementStatus,
}: {
  open: boolean;
  onClose: () => void;
  userEmail: string;
  displayName: string;
  roleTitle: string;
  agreementId?: string | null;
  agreementStatus?: "pending" | "signed" | "revoked";
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const newPassword = (formData.get("new_password") as string)?.trim();
    const confirmPassword = (formData.get("confirm_password") as string)?.trim();

    if (!newPassword || newPassword.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setLoading(true);
    const result = await updateMyPassword(newPassword);
    setLoading(false);

    if ("success" in result) {
      setMessage({ text: "Password successfully updated!", type: "success" });
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1500);
    } else {
      setMessage({ text: result.error, type: "error" });
    }
  }

  return (
    <CrmModal open={open} onClose={onClose} title="My Account & Security">
      <div className="flex flex-col gap-5">
        {/* User Info Card */}
        <div className="bg-header/30 border border-border/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">{displayName}</h3>
            <p className="text-xs text-muted mt-0.5">{userEmail}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue border border-accent-blue/30 capitalize">
            {roleTitle}
          </span>
        </div>

        {/* Signed Agreement Section */}
        {agreementId && (
          <div className="p-3.5 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <FileText size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Assistant Agreement & NDA</p>
                <p className="text-[11px] text-muted">
                  {agreementStatus === "signed" ? "✓ Digitally Signed & Sealed" : "Status: Pending"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={`/api/crm/agreements/${agreementId}/download?preview=true`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-header/40 text-foreground flex items-center gap-1 transition-colors"
                title="Preview Agreement"
              >
                <ExternalLink size={13} />
                <span>Preview</span>
              </a>
              <a
                href={`/api/crm/agreements/${agreementId}/download`}
                download
                className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue border border-accent-blue/30 flex items-center gap-1 transition-colors"
                title="Download Signed PDF"
              >
                <Download size={13} />
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        )}

        {/* Change Password Form */}
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 pb-2 border-b border-border/60">
            <KeyRound size={15} className="text-accent-blue" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Change Password</h4>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                message.type === "error"
                  ? "bg-red-400/10 border-red-400/30 text-red-300"
                  : "bg-accent-green/10 border-accent-green/30 text-accent-green"
              }`}
            >
              {message.type === "error" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              <span>{message.text}</span>
            </div>
          )}

          <div>
            <label className={crmLabelClass} htmlFor="new_password">New Password</label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              className={crmInputClass}
            />
          </div>

          <div>
            <label className={crmLabelClass} htmlFor="confirm_password">Confirm New Password</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              className={crmInputClass}
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className={crmSecondaryBtnClass}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={crmPrimaryBtnClass}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </CrmModal>
  );
}
