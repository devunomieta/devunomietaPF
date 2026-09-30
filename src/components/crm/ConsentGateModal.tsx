"use client";

import { useState, useMemo } from "react";
import { ShieldCheck, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { signAgreementAction } from "@/app/crm/users/actions";
import { CANONICAL_AGREEMENT_TERMS, AGREEMENT_VERSION } from "@/lib/crm/agreements/agreementText";

/**
 * Calculates accurate age taking month/day into account.
 */
function getAgeFromDob(dobString: string): number | null {
  if (!dobString) return null;
  const birth = new Date(dobString + "T00:00:00");
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

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

  // Maximum allowed date for 18 years of age
  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  }, []);

  // Real-time age feedback
  const calculatedAge = useMemo(() => getAgeFromDob(dateOfBirth), [dateOfBirth]);
  const isUnderage = calculatedAge !== null && calculatedAge < 18;
  const isFutureDate = dateOfBirth ? new Date(dateOfBirth + "T00:00:00") > new Date() : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError("Please check the confirmation box to indicate that you agree to the terms.");
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

    if (calculatedAge === null || calculatedAge < 18) {
      setError("You must be at least 18 years old to sign this agreement.");
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
              Welcome aboard! Please review and sign your team agreement before entering ({AGREEMENT_VERSION})
            </p>
          </div>
          <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">
            Action Required
          </span>
        </div>

        {/* Scrollable Agreement Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-muted/20 text-xs text-foreground/90 leading-relaxed border-b border-border select-text">
          <div className="p-3.5 bg-accent-blue/10 border border-accent-blue/20 rounded-lg text-accent-blue font-sans text-xs flex items-start gap-2.5">
            <FileText size={18} className="shrink-0 mt-0.5 text-accent-blue" />
            <div>
              <strong>Please review your terms carefully:</strong> You are joining as a{" "}
              <strong>{roleTitle}</strong> working directly with Joseph Unomieta. By signing below, you agree to your scope of responsibilities, our ongoing mentorship commitment, the <strong>15% Net Profit Sharing formula</strong> (calculated after direct delivery expenses), and a <strong>perpetual non-disclosure commitment</strong> to protect confidential information.
            </div>
          </div>

          <div className="bg-background/80 p-5 rounded-xl border border-border text-foreground/90 font-sans text-xs space-y-3 leading-relaxed shadow-inner">
            <ReactMarkdown
              components={{
                h1: ({ ...props }) => (
                  <h1 className="text-sm font-bold text-foreground border-b border-border pb-2 mt-2 mb-3" {...props} />
                ),
                h2: ({ ...props }) => (
                  <h2 className="text-xs font-bold text-foreground mt-4 mb-2 uppercase tracking-wide" {...props} />
                ),
                h3: ({ ...props }) => (
                  <h3 className="text-xs font-bold text-accent-blue mt-4 mb-1.5 uppercase tracking-wide" {...props} />
                ),
                p: ({ ...props }) => <p className="mb-2 leading-relaxed text-foreground/85" {...props} />,
                strong: ({ ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                ul: ({ ...props }) => <ul className="list-disc pl-5 space-y-1 mb-2 text-foreground/85" {...props} />,
                ol: ({ ...props }) => <ol className="list-decimal pl-5 space-y-1 mb-2 text-foreground/85" {...props} />,
                li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
                hr: () => <hr className="border-border/60 my-3" />,
                code: ({ ...props }) => (
                  <code className="px-2 py-0.5 rounded bg-muted/30 font-mono text-[11px] text-accent-blue" {...props} />
                ),
              }}
            >
              {CANONICAL_AGREEMENT_TERMS}
            </ReactMarkdown>
          </div>
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
                max={maxDobDate}
                value={dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 ${
                  isUnderage || isFutureDate
                    ? "border-red-500 focus:ring-red-500/50"
                    : calculatedAge !== null && calculatedAge >= 18
                    ? "border-emerald-500/60 focus:ring-emerald-500/50"
                    : "border-border focus:ring-accent-blue/50"
                }`}
              />

              {/* Real-time age feedback */}
              {isFutureDate ? (
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} className="shrink-0" />
                  Date cannot be in the future.
                </p>
              ) : isUnderage ? (
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} className="shrink-0" />
                  You must be at least 18 years old to sign (currently {calculatedAge} {calculatedAge === 1 ? "year" : "years"} old).
                </p>
              ) : calculatedAge !== null && calculatedAge >= 18 ? (
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} className="shrink-0" />
                  Age verified ({calculatedAge} years old)
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-muted">Must be 18 years or older</p>
              )}
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

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/80">
            <span className="text-[11px] text-muted leading-tight">
              🔒 For your security and compliance, your IP address, device, and signing timestamp are securely recorded as part of your digital signature audit trail.
            </span>
            <button
              type="submit"
              disabled={loading || !termsAccepted || isUnderage || isFutureDate || !dateOfBirth}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-colors shrink-0"
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

