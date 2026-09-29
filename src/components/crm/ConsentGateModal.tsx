"use client";

import { useState } from "react";
import { ShieldCheck, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { signAgreementAction } from "@/app/crm/users/actions";
import { CANONICAL_AGREEMENT_TERMS, AGREEMENT_VERSION } from "@/lib/crm/agreements/agreementText";

export function ConsentGateModal({
  defaultDisplayName,
  roleTitle,
}: {
  defaultDisplayName: string;
  roleTitle: string;
}) {
  const parts = defaultDisplayName.trim().split(" ");
  const initialFirst = parts[0] || "";
  const initialLast = parts.slice(1).join(" ") || "";

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError("You must check the confirmation box to indicate your consent to the terms.");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your legal First Name and Last Name.");
      return;
    }

    if (!dateOfBirth) {
      setError("Please provide your Date of Birth for identity verification.");
      return;
    }

    setLoading(true);
    const res = await signAgreementAction({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      termsAccepted: true,
    });

    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      // Reload page immediately to clear gate server-side
      window.location.reload();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-header/40 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center shrink-0 border border-accent-blue/30 shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">
              Personal Assistant Agreement & Perpetual NDA
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Mandatory Consent & Identity Verification before entering CRM ({AGREEMENT_VERSION})
            </p>
          </div>
          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">
            Action Required
          </span>
        </div>

        {/* Scrollable Agreement Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-muted/20 text-xs text-foreground/90 font-mono leading-relaxed border-b border-border select-text">
          <div className="p-3.5 bg-accent-blue/10 border border-accent-blue/20 rounded-lg text-accent-blue font-sans text-xs flex items-start gap-2.5">
            <FileText size={18} className="shrink-0 mt-0.5 text-accent-blue" />
            <div>
              <strong>Please review your terms carefully:</strong> You have been appointed as a{" "}
              <strong>{roleTitle}</strong> to Joseph Unomieta. By consenting below, you agree to the scope of duties,
              mentorship commitment, the <strong>15% Net Profit Sharing formula</strong> (deducting direct delivery costs
              upon service completion), and a <strong>Perpetual (lifetime) Non-Disclosure Agreement</strong>.
            </div>
          </div>

          <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/80 leading-relaxed bg-background/60 p-4 rounded-xl border border-border">
            {CANONICAL_AGREEMENT_TERMS}
          </pre>
        </div>

        {/* Legal Form & Consent */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 bg-card space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Legal First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Legal Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded border-border text-accent-blue focus:ring-accent-blue h-4 w-4"
              />
              <span className="text-xs text-foreground/90 leading-tight">
                <strong>I agree to terms of working:</strong> I confirm that I have read and agree to all terms of this
                Personal Assistant Agreement, the 15% Net Profit Sharing terms, and the Perpetual Non-Disclosure
                Agreement. I understand that entering my legal name and date of birth constitutes my legally binding
                electronic signature.
              </span>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-border/80">
            <span className="text-[11px] text-muted hidden sm:inline">
              Audit Telemetry: IP, device &amp; timestamp will be recorded upon submission.
            </span>
            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Recording Digital Signature...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Sign Agreement &amp; Enter CRM</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
