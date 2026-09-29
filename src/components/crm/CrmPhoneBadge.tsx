"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { validatePhone } from "@/lib/crm/phone";
import { CrmTooltip } from "./CrmTooltip";

export function CrmPhoneBadge({
  phone,
  onEditClick,
}: {
  phone: string | null | undefined;
  onEditClick?: () => void;
}) {
  if (!phone) return <span className="text-muted">—</span>;

  const validation = validatePhone(phone);

  if (validation.isValid) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <a href={`tel:${validation.sanitized}`} className="text-foreground hover:text-accent-blue transition-colors">
          {phone}
        </a>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-foreground line-through opacity-80">{phone}</span>
      <CrmTooltip text={validation.issueDescription || "Invalid phone number format. WhatsApp and direct calling will not work."}>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400 border border-amber-400/30 text-[10px] font-semibold cursor-help">
          <AlertTriangle size={11} /> Invalid
        </span>
      </CrmTooltip>
      {onEditClick && (
        <button
          type="button"
          onClick={onEditClick}
          className="text-[10px] text-accent-blue hover:underline font-medium ml-1"
        >
          Fix
        </button>
      )}
    </div>
  );
}
