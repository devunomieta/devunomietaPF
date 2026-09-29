import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getCrmAuthUser } from "@/lib/crm/auth";
import { renderAgreementPdf } from "@/lib/crm/agreements/pdf";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getCrmAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const adminDb = createAdminClient();

    // Fetch the agreement record
    const { data: agreement, error: agreementError } = await adminDb
      .from("crm_team_agreements")
      .select("*, crm_users!inner(id, email, display_name, role_title)")
      .eq("id", id)
      .maybeSingle();

    if (agreementError || !agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    // Permission check: only Super Admin or the specific agreement owner can view/download
    const userEmail = agreement.crm_users?.email?.toLowerCase();
    if (!authUser.isSuperAdmin && authUser.email.toLowerCase() !== userEmail) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const isPreview = req.nextUrl.searchParams.get("preview") === "true";
    const assistantName = agreement.first_name && agreement.last_name 
      ? `${agreement.first_name} ${agreement.last_name}` 
      : agreement.crm_users?.display_name || "Team Member";

    // Non-super admins won't see DOB in raw parameter logs if masked, but we include in their own doc
    const pdfBuffer = await renderAgreementPdf({
      agreementId: agreement.id,
      version: agreement.version,
      termsHash: agreement.terms_hash,
      assistantName,
      assistantEmail: agreement.crm_users?.email || "",
      assistantRole: agreement.crm_users?.role_title || "Personal Assistant",
      dateOfBirth: agreement.date_of_birth,
      signedAt: agreement.signed_at,
      ipAddress: agreement.ip_address,
      deviceSummary: agreement.device_summary,
      status: agreement.status,
      createdDate: agreement.created_at,
    });

    const sanitizedName = assistantName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Agreement_NDA_${sanitizedName}_${agreement.version}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": isPreview
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating agreement PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate agreement document" },
      { status: 500 }
    );
  }
}
