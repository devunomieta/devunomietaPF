import { NextRequest, NextResponse } from "next/server";
import { resolveShortLinkAndTrack } from "@/lib/crm/shortLinkActions";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const cleanSlug = slug?.trim().toLowerCase();

  if (!cleanSlug) {
    return NextResponse.next();
  }

  const destination = await resolveShortLinkAndTrack(cleanSlug);

  if (destination) {
    return NextResponse.redirect(new URL(destination), {
      status: 307,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  // If not found as a short link, proceed to Next.js normal 404 / route matching
  return NextResponse.next();
}
