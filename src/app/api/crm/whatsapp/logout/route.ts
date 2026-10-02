import { NextResponse } from "next/server";
import { logoutBaileysDevice } from "@/lib/crm/whatsapp";
import { requireCrmUser } from "@/lib/crm/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await requireCrmUser({ page: "whatsapp", action: "whatsapp_send" });

  const result = await logoutBaileysDevice();
  return NextResponse.json(result);
}
