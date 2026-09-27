"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { crmPrimaryBtnClass } from "@/components/crm/CrmModal";
import { processJobsNow } from "./actions";

export function MonitoringActions() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function handleProcessNow() {
    setLoading(true);
    const result = await processJobsNow();
    setLoading(false);
    setLastResult(`Touched ${result.jobsTouched} job(s)`);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-3">
      {lastResult && <span className="text-xs text-muted">{lastResult}</span>}
      <button onClick={handleProcessNow} disabled={loading} className={crmPrimaryBtnClass}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        Process jobs now
      </button>
    </div>
  );
}
