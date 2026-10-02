import { NextResponse } from "next/server";
import { getBaileysQrCode, getWhatsAppInstanceState } from "@/lib/crm/whatsapp";
import { requireCrmUser } from "@/lib/crm/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireCrmUser({ page: "whatsapp" });

  const status = await getWhatsAppInstanceState();
  if (status.state === "authorized" || status.state === "connected") {
    return NextResponse.json({ state: "connected", phone: status.phone, qr: null });
  }

  const qrResult = await getBaileysQrCode();
  if ("error" in qrResult) {
    return NextResponse.json({ error: qrResult.error, state: status.state }, { status: 503 });
  }

  return NextResponse.json({ qr: qrResult.qr, state: qrResult.state });
}
