"use client";

import { useState, useEffect } from "react";
import { QrCode, Wifi, WifiOff, RefreshCw, LogOut, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface WhatsAppDeviceModalProps {
  initialState: string;
  connectedPhone?: string | null;
  provider: string;
}

export function WhatsAppDeviceModal({ initialState, connectedPhone, provider }: WhatsAppDeviceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState(initialState);
  const [phone, setPhone] = useState(connectedPhone);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairMode, setPairMode] = useState<"qr" | "code">("qr");
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const router = useRouter();

  const isConnected = state === "authorized" || state === "connected";

  // Fetch QR code
  const fetchQr = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/whatsapp/qr");
      const data = await res.json();
      if (data.qr) {
        setQr(data.qr);
        setState(data.state || "qr_ready");
      } else if (data.state === "connected" || data.state === "authorized") {
        setState("connected");
        setPhone(data.phone);
        setQr(null);
      } else {
        setError(data.error || "Waiting for WhatsApp bridge to generate QR code...");
      }
    } catch {
      setError("Could not reach WhatsApp bridge. Verify Render service is Live.");
    } finally {
      setLoading(false);
    }
  };

  // Poll state while modal is open and not connected
  useEffect(() => {
    if (!isOpen || isConnected) return;

    fetchQr();
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/crm/whatsapp/qr");
        const data = await res.json();
        if (data.state === "connected" || data.state === "authorized") {
          setState("connected");
          setPhone(data.phone);
          setQr(null);
          router.refresh();
        } else if (data.qr) {
          setQr(data.qr);
        }
      } catch {
        // quiet poll
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, isConnected]);

  // Request 8-digit pairing code (Recommendation 1)
  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingPhone.trim()) return;
    setRequestingCode(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/whatsapp/pair-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: pairingPhone }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setPairingCode(data.code);
      } else {
        setError(data.error || "Failed to generate pairing code. Please retry.");
      }
    } catch {
      setError("Network error contacting WhatsApp bridge.");
    } finally {
      setRequestingCode(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to unlink this WhatsApp device?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/crm/whatsapp/logout", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setState("disconnected");
        setPhone(null);
        setQr(null);
        router.refresh();
        fetchQr();
      } else {
        alert(data.error || "Logout failed");
      }
    } catch {
      alert("Network error unlinking device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Status Badge */}
      {isConnected ? (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Connected {phone ? `(+${phone})` : ""}</span>
          {provider === "baileys" && (
            <button
              onClick={() => setIsOpen(true)}
              className="ml-1 text-[11px] underline text-muted hover:text-foreground cursor-pointer"
            >
              Manage
            </button>
          )}
        </div>
      ) : (
        <div className="inline-flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-400/15 text-red-400 border border-red-400/30">
            <WifiOff size={13} />
            <span>Disconnected</span>
          </div>
          {provider === "baileys" && (
            <button
              onClick={() => {
                setIsOpen(true);
                fetchQr();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-blue/20 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/30 transition-colors cursor-pointer"
            >
              <QrCode size={13} />
              Link Device
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-panel border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <QrCode className="text-accent-blue" size={20} />
                <h3 className="font-semibold text-foreground text-base">WhatsApp Multi-Device Link</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-foreground text-sm px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="py-5 flex flex-col items-center text-center">
              {isConnected ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="font-medium text-foreground">WhatsApp is Linked & Online</h4>
                  <p className="text-xs text-muted max-w-xs">
                    Connected phone number: <strong className="text-foreground">+{phone}</strong>. Messages sent via CRM will dispatch from this number.
                  </p>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    {loading ? "Unlinking..." : "Unlink This Device"}
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  {/* Mode Selector Tabs */}
                  <div className="flex items-center gap-2 p-1 bg-header/40 border border-border/60 rounded-xl mb-4 text-xs">
                    <button
                      type="button"
                      onClick={() => setPairMode("qr")}
                      className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                        pairMode === "qr" ? "bg-accent-blue text-white" : "text-muted hover:text-foreground"
                      }`}
                    >
                      Scan QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setPairMode("code")}
                      className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                        pairMode === "code" ? "bg-accent-blue text-white" : "text-muted hover:text-foreground"
                      }`}
                    >
                      8-Digit Pairing Code
                    </button>
                  </div>

                  {pairMode === "qr" ? (
                    qr ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-white rounded-xl shadow-inner border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qr} alt="WhatsApp QR Code" className="w-56 h-56 rounded-md" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <RefreshCw size={12} className="animate-spin text-accent-blue" />
                          <span>Auto-refreshing QR code</span>
                        </div>
                        <ol className="text-left text-xs text-muted/90 space-y-1.5 mt-2 bg-header/40 p-3 rounded-xl border border-border/40 w-full">
                          <li>1. Open <strong>WhatsApp</strong> on your phone</li>
                          <li>2. Tap <strong>Linked Devices</strong> → <strong>Link a Device</strong></li>
                          <li>3. Scan the QR code shown above</li>
                        </ol>
                      </div>
                    ) : (
                      <div className="py-8 flex flex-col items-center gap-3">
                        {loading ? (
                          <RefreshCw size={28} className="animate-spin text-accent-blue" />
                        ) : (
                          <AlertCircle size={28} className="text-yellow-400" />
                        )}
                        <p className="text-xs text-muted max-w-xs">
                          {error || "Generating WhatsApp pairing code from Render bridge..."}
                        </p>
                        <button
                          onClick={fetchQr}
                          className="mt-2 text-xs text-accent-blue hover:underline"
                        >
                          Retry connection
                        </button>
                      </div>
                    )
                  ) : (
                    /* Pairing Code Tab (Recommendation 1) */
                    <div className="w-full flex flex-col items-center gap-3">
                      {pairingCode ? (
                        <div className="flex flex-col items-center gap-3 py-2 w-full">
                          <div className="p-4 bg-header/50 border border-accent-blue/40 rounded-xl w-full text-center">
                            <span className="text-xs text-muted uppercase tracking-wider block mb-1">Your 8-Digit Pairing Code</span>
                            <span className="font-mono text-2xl font-bold tracking-widest text-accent-blue">{pairingCode}</span>
                          </div>
                          <ol className="text-left text-xs text-muted/90 space-y-1.5 bg-header/40 p-3 rounded-xl border border-border/40 w-full">
                            <li>1. Open WhatsApp notification on phone <strong>+{pairingPhone}</strong></li>
                            <li>2. Tap <strong>&quot;Enter pairing code&quot;</strong></li>
                            <li>3. Type the 8-character code displayed above</li>
                          </ol>
                          <button
                            type="button"
                            onClick={() => setPairingCode(null)}
                            className="text-xs text-accent-blue hover:underline mt-1 cursor-pointer"
                          >
                            Enter another number
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleRequestPairingCode} className="w-full flex flex-col gap-3">
                          <div className="text-left">
                            <label className="text-xs text-muted font-medium mb-1 block">WhatsApp Phone Number</label>
                            <input
                              type="tel"
                              placeholder="e.g. +2348012345678"
                              value={pairingPhone}
                              onChange={(e) => setPairingPhone(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-header border border-border text-foreground text-sm focus:outline-none focus:border-accent-blue"
                              required
                            />
                            <p className="text-[11px] text-muted mt-1">Include country code (e.g. +234 for Nigeria).</p>
                          </div>
                          {error && <p className="text-xs text-red-400">{error}</p>}
                          <button
                            type="submit"
                            disabled={requestingCode || !pairingPhone.trim()}
                            className="w-full py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {requestingCode ? "Requesting code..." : "Generate 8-Digit Code"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/60 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-header/60 hover:bg-header border border-border text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
