import { NextResponse } from "next/server";
import { requestBaileysPairingCode } from "@/lib/crm/whatsapp";
import { requireCrmUser } from "@/lib/crm/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireCrmUser({ page: "whatsapp", action: "whatsapp_send" });

  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const result = await requestBaileysPairingCode(phone);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to generate pairing code" }, { status: 502 });
    }

    return NextResponse.json({ success: true, code: result.code });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
