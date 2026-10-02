import { normalizeE164Phone } from "@/lib/crm/phone";

/**
 * WhatsApp Provider Integration via self-hosted Baileys bridge.
 */

const BAILEYS_URL = process.env.BAILEYS_BRIDGE_URL;
const BAILEYS_SECRET = process.env.BAILEYS_BRIDGE_SECRET;

export function isWhatsAppConfigured(): boolean {
  return Boolean(BAILEYS_URL && BAILEYS_SECRET);
}

// Backwards compatibility alias
export const isGreenApiConfigured = isWhatsAppConfigured;

export type WhatsAppInstanceState = {
  state: "authorized" | "connected" | "qr_ready" | "connecting" | "disconnected" | "notAuthorized" | "unconfigured";
  phone?: string | null;
  qr?: string | null;
  provider: "baileys" | "none";
  error?: string;
};

/**
 * Fetches connection state from the Baileys bridge.
 */
export async function getWhatsAppInstanceState(): Promise<WhatsAppInstanceState> {
  if (BAILEYS_URL && BAILEYS_SECRET) {
    try {
      const endpoint = `${BAILEYS_URL.replace(/\/$/, "")}/status`;
      const res = await fetch(endpoint, {
        headers: { "x-service-key": BAILEYS_SECRET },
        cache: "no-store",
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        const state = data.state === "connected" ? "authorized" : data.state;
        return {
          state: state || "disconnected",
          phone: data.phone || null,
          provider: "baileys",
        };
      }
    } catch {
      return { state: "disconnected", provider: "baileys", error: "Could not reach Baileys bridge" };
    }
  }

  return { state: "unconfigured", provider: "none" };
}

// Backwards compatibility alias
export async function getGreenApiInstanceState(): Promise<{ state: string } | { error: string }> {
  const result = await getWhatsAppInstanceState();
  return { state: result.state };
}

/**
 * Fetches the active QR code for phone pairing (Baileys).
 */
export async function getBaileysQrCode(): Promise<{ qr: string | null; state: string } | { error: string }> {
  if (!BAILEYS_URL || !BAILEYS_SECRET) {
    return { error: "Baileys bridge is not configured. Set BAILEYS_BRIDGE_URL and BAILEYS_BRIDGE_SECRET." };
  }

  try {
    const res = await fetch(`${BAILEYS_URL.replace(/\/$/, "")}/qr`, {
      headers: { "x-service-key": BAILEYS_SECRET },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    return { qr: data.qr || null, state: data.state || "unknown" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch QR code from bridge" };
  }
}

/**
 * Log out and unlink the active WhatsApp device from the Baileys bridge.
 */
export async function logoutBaileysDevice(): Promise<{ success: boolean; error?: string }> {
  if (!BAILEYS_URL || !BAILEYS_SECRET) {
    return { success: false, error: "Baileys bridge is not configured." };
  }

  try {
    const res = await fetch(`${BAILEYS_URL.replace(/\/$/, "")}/logout`, {
      method: "POST",
      headers: { "x-service-key": BAILEYS_SECRET },
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Logout failed" };
  }
}

/**
 * WhatsApp Message Sender using Baileys bridge.
 */
export async function sendWhatsAppMessage({
  phone,
  message,
}: {
  phone: string;
  message: string;
}): Promise<{ success: true; messageId: string } | { error: string }> {
  const chatId = normalizeE164Phone(phone);
  if (!chatId) return { error: `"${phone}" doesn't look like a valid phone number.` };

  if (!BAILEYS_URL || !BAILEYS_SECRET) {
    return { error: "WhatsApp is not configured. Set BAILEYS_BRIDGE_URL & BAILEYS_BRIDGE_SECRET." };
  }

  try {
    const res = await fetch(`${BAILEYS_URL.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": BAILEYS_SECRET,
      },
      body: JSON.stringify({ phone: chatId, message }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { error: data.error || `Baileys send failed (${res.status})` };
    }

    return { success: true, messageId: data.messageId as string };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error contacting Baileys bridge" };
  }
}
