"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, X, Loader2 } from "lucide-react";

type ToastItem = { id: number; message: string; type: "error" | "success" };
type ConfirmOptions = { title?: string; confirmLabel?: string; danger?: boolean };
type ConfirmState = (ConfirmOptions & { message: string; resolve: (value: boolean) => void }) | null;

type CrmFeedbackContextValue = {
  toast: (message: string, type?: "error" | "success") => void;
  confirm: (message: string, opts?: ConfirmOptions) => Promise<boolean>;
};

const CrmFeedbackContext = createContext<CrmFeedbackContextValue | null>(null);

export function CrmFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const toast = useCallback((message: string, type: "error" | "success" = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const confirm = useCallback((message: string, opts?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve, ...opts });
    });
  }, []);

  function resolveConfirm(result: boolean) {
    confirmState?.resolve(result);
    setConfirmState(null);
  }

  return (
    <CrmFeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-96">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm backdrop-blur-sm ${
              t.type === "error"
                ? "bg-red-400/10 border-red-400/30 text-red-300"
                : "bg-accent-green/10 border-accent-green/30 text-accent-green"
            }`}
          >
            {t.type === "error" ? (
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="opacity-60 hover:opacity-100 shrink-0"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => resolveConfirm(false)} />
          <div className="relative w-full max-w-sm bg-background border border-border rounded-xl p-5 shadow-2xl">
            <h2 className="text-base font-semibold text-foreground mb-2">{confirmState.title || "Are you sure?"}</h2>
            <p className="text-sm text-muted mb-5">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => resolveConfirm(false)}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-header/50 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                className={`px-4 py-2 rounded-lg transition-all text-sm text-white ${
                  confirmState.danger ? "bg-red-500 hover:bg-red-500/80" : "bg-accent-blue hover:bg-accent-blue/80"
                }`}
              >
                {confirmState.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CrmFeedbackContext.Provider>
  );
}

export function useCrmFeedback() {
  const ctx = useContext(CrmFeedbackContext);
  if (!ctx) throw new Error("useCrmFeedback must be used within CrmFeedbackProvider");
  return ctx;
}
