// GREEN-API wraps the WhatsApp Web multi-device protocol behind a REST API.
// See docs/CRM_SETUP.md for how to create an instance and get these two values.
const idInstance = process.env.GREEN_API_ID_INSTANCE;
const apiTokenInstance = process.env.GREEN_API_API_TOKEN_INSTANCE;
const baseUrl = process.env.GREEN_API_BASE_URL || "https://api.green-api.com";

export function isGreenApiConfigured() {
  return Boolean(idInstance && apiTokenInstance);
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export async function sendWhatsAppMessage({
  phone,
  message,
}: {
  phone: string;
  message: string;
}): Promise<{ success: true; messageId: string } | { error: string }> {
  if (!isGreenApiConfigured()) {
    return { error: "WhatsApp is not configured — set GREEN_API_ID_INSTANCE and GREEN_API_API_TOKEN_INSTANCE." };
  }

  const chatId = normalizePhone(phone);
  if (!chatId) return { error: `"${phone}" doesn't look like a valid phone number.` };

  try {
    const response = await fetch(
      `${baseUrl}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: `${chatId}@c.us`, message }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return { error: data?.message || `GREEN-API error (${response.status})` };
    }

    return { success: true, messageId: data.idMessage as string };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown WhatsApp send error" };
  }
}

export async function getGreenApiInstanceState(): Promise<{ state: string } | { error: string }> {
  if (!isGreenApiConfigured()) return { error: "WhatsApp is not configured." };
  try {
    const response = await fetch(`${baseUrl}/waInstance${idInstance}/getStateInstance/${apiTokenInstance}`);
    const data = await response.json();
    if (!response.ok) return { error: data?.message || `GREEN-API error (${response.status})` };
    return { state: data.stateInstance as string };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
