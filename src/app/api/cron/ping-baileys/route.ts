import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 10-Minute Keepalive Ping for Render Free Tier.
 * Called automatically by Vercel Cron.
 * Ensures the Baileys WebSocket daemon never goes to sleep.
 */
export async function GET(request: Request) {
  const bridgeUrl = process.env.BAILEYS_BRIDGE_URL;

  // Verify cron secret if configured
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also allow Vercel standard cron header
    const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron");
    if (!isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!bridgeUrl) {
    return NextResponse.json({ ok: false, message: "BAILEYS_BRIDGE_URL not set" }, { status: 200 });
  }

  try {
    const healthUrl = `${bridgeUrl.replace(/\/$/, "")}/health`;
    const response = await fetch(healthUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();
    return NextResponse.json({
      ok: true,
      pingedAt: new Date().toISOString(),
      bridgeStatus: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to ping Baileys bridge",
      },
      { status: 502 }
    );
  }
}
