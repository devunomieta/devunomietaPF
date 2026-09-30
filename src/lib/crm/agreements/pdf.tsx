import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import { PRINCIPAL_NAME, PRINCIPAL_TITLE } from "./agreementText";

export type AgreementPdfProps = {
  agreementId: string;
  version: string;
  termsHash: string;
  assistantName: string;
  assistantEmail: string;
  assistantRole: string;
  dateOfBirth?: string | null;
  signedAt?: string | null;
  ipAddress?: string | null;
  deviceSummary?: string | null;
  status: "pending" | "signed" | "revoked";
  createdDate: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 45,
    paddingHorizontal: 40,
    fontSize: 9.5,
    color: "#1e293b",
    fontFamily: "Helvetica",
    lineHeight: 1.45,
  },
  headerBanner: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#0284c7",
    paddingBottom: 10,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  docSub: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  badgeSigned: {
    backgroundColor: "#ecfdf5",
    color: "#059669",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  badgePending: {
    backgroundColor: "#fffbeb",
    color: "#d97706",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  preambleBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  preambleRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  preambleLabel: {
    width: 110,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: "#475569",
  },
  preambleVal: {
    flex: 1,
    fontSize: 8.5,
    color: "#0f172a",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
    marginTop: 8,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  paragraph: {
    marginBottom: 6,
    textAlign: "justify",
  },
  bulletPoint: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 10,
  },
  bulletDot: {
    width: 10,
    fontSize: 9,
    color: "#0284c7",
  },
  bulletText: {
    flex: 1,
    textAlign: "justify",
  },
  highlightBox: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
    padding: 6,
    marginVertical: 4,
  },
  highlightText: {
    fontSize: 8.5,
    color: "#1e40af",
    fontFamily: "Helvetica-Bold",
  },
  signaturesContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigBox: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 8,
  },
  sigBoxTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 3,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sigLine: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 2.5,
  },
  sigValue: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  stamp: {
    marginTop: 5,
    padding: 4,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 3,
    alignItems: "center",
  },
  stampText: {
    fontSize: 7.5,
    color: "#047857",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
  },
});

export function AgreementPdfDocument(props: AgreementPdfProps) {
  const isSigned = props.status === "signed";

  return (
    <Document>
      {/* Page 1: Articles 1 to 3 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBanner}>
          <View>
            <Text style={styles.docTitle}>Personal Assistant Agreement & NDA</Text>
            <Text style={styles.docSub}>
              Document Ref: {props.agreementId.slice(0, 13)}... | Version {props.version}
            </Text>
          </View>
          <Text style={isSigned ? styles.badgeSigned : styles.badgePending}>
            {isSigned ? "Officially Executed & Sealed" : "Pending Signature"}
          </Text>
        </View>

        {/* Preamble Information Box */}
        <View style={styles.preambleBox}>
          <View style={styles.preambleRow}>
            <Text style={styles.preambleLabel}>Principal / Disclosing:</Text>
            <Text style={styles.preambleVal}>{PRINCIPAL_NAME} ({PRINCIPAL_TITLE})</Text>
          </View>
          <View style={styles.preambleRow}>
            <Text style={styles.preambleLabel}>Assistant / Receiving:</Text>
            <Text style={styles.preambleVal}>
              {props.assistantName} ({props.assistantRole}) &lt;{props.assistantEmail}&gt;
            </Text>
          </View>
          <View style={styles.preambleRow}>
            <Text style={styles.preambleLabel}>Date of Execution:</Text>
            <Text style={styles.preambleVal}>
              {props.signedAt ? new Date(props.signedAt).toUTCString() : "Pending Execution"}
            </Text>
          </View>
          <View style={styles.preambleRow}>
            <Text style={styles.preambleLabel}>Cryptographic Hash:</Text>
            <Text style={styles.preambleVal}>{props.termsHash.slice(0, 32)}... (SHA-256)</Text>
          </View>
        </View>

        {/* Article 1 */}
        <Text style={styles.sectionTitle}>Article 1: Collaborative Engagement & Scope</Text>
        <Text style={styles.paragraph}>
          Exceptional work is built on mutual respect and continuous shared growth. The Principal warmly engages the Assistant as a trusted Virtual and/or Physical Personal Assistant to Joseph Unomieta. The scope of responsibilities includes:
        </Text>
        <View style={styles.bulletPoint}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Executive operations: co-managing professional schedules, day-to-day operational workflows, appointments, and delegated executive tasks with promptness and discretion.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Channel stewardship: organizing, curating, and publishing content across official communication channels (WhatsApp Business, LinkedIn, X/Twitter, Instagram, and official email).
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            CRM stewardship: keeping client records up-to-date, logging touchpoints, coordinating email campaigns, and nurturing prospective relationships.
          </Text>
        </View>

        {/* Article 2 */}
        <Text style={styles.sectionTitle}>Article 2: Active Mentorship & Personal Growth</Text>
        <Text style={styles.paragraph}>
          We view your journey as an opportunity to build lifelong, high-leverage skills. The Principal is personally dedicated to mentoring the Assistant, offering hands-on coaching, technical guidance, and operational methodologies whenever new learning curves or growth opportunities arise.
        </Text>

        {/* Article 3 */}
        <Text style={styles.sectionTitle}>Article 3: Compensation & 15% Net Profit-Sharing Formula</Text>
        <Text style={styles.paragraph}>
          We win together. In consideration of services rendered, the Assistant is directly rewarded with fifteen percent (15%) of declared net profit from every paying client account or project actively co-handled with the Principal.
        </Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>
            TRANSPARENT METRIC: 15% OF NET PROFIT (NOT GROSS REVENUE OR TOTAL FUNDS RECEIVED)
          </Text>
          <Text style={{ fontSize: 8, color: "#1e3a8a", marginTop: 2 }}>
            Formula: Assistant Profit Share = 15% × (Gross Paid Client Revenue - Direct Service Delivery Costs)
          </Text>
        </View>
        <Text style={styles.paragraph}>
          All direct project expenditures—including software/API licenses, cloud servers, domain registrations, payment processing fees, and sub-contractor costs—are deducted first. Net profit is calculated and formally declared upon successful completion of service delivery and full invoice settlement.
        </Text>

        <View style={styles.footer}>
          <Text>Personal Assistant Collaboration Agreement & NDA | Ref: {props.agreementId.slice(0, 8)}</Text>
          <Text>Page 1 of 2</Text>
        </View>
      </Page>

      {/* Page 2: Articles 4 to 6 + Signatures */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBanner}>
          <View>
            <Text style={styles.docTitle}>Personal Assistant Collaboration Agreement & NDA</Text>
            <Text style={styles.docSub}>Articles 4–6 & Official Signatures</Text>
          </View>
          <Text style={isSigned ? styles.badgeSigned : styles.badgePending}>
            {isSigned ? "Legally Binding" : "Pending Signature"}
          </Text>
        </View>

        {/* Article 4 */}
        <Text style={styles.sectionTitle}>Article 4: Mutual Trust & Perpetual Confidentiality (NDA)</Text>
        <Text style={styles.paragraph}>
          In this collaborative role, the Assistant accesses proprietary strategies, financial figures, systems, and client data. Because trust has no expiration date, the obligation to safeguard all Confidential Information remains PERPETUAL (FOR LIFE) and survives any conclusion of this engagement indefinitely.
        </Text>
        <View style={styles.bulletPoint}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Protects all non-public information communicated verbally, in writing, seen in databases, or observed during operations.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Zero unauthorized duplication, copying, leaking, or distribution of files, credentials, or client data to any third party.
          </Text>
        </View>
        <View style={styles.bulletPoint}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Sole Exception: Mandatory disclosures required by a court of competent jurisdiction under immediate prior written notice to the Principal.
          </Text>
        </View>

        {/* Article 5 */}
        <Text style={styles.sectionTitle}>Article 5: Non-Solicitation & Intellectual Property</Text>
        <Text style={styles.paragraph}>
          During our collaboration and for twenty-four (24) months thereafter, the Assistant agrees not to solicit or divert clients, leads, or partners introduced through the Principal. All CRM systems, code, and materials remain the exclusive property of the Principal.
        </Text>

        {/* Article 6 */}
        <Text style={styles.sectionTitle}>Article 6: Electronic Execution & Audit Telemetry</Text>
        <Text style={styles.paragraph}>
          Electronic execution through authenticated portal login with verified First Name, Last Name, and Date of Birth constitutes an intentional, legally binding signature under electronic commerce laws.
        </Text>

        {/* Signatures & Execution Block */}
        <View style={styles.signaturesContainer}>
          {/* Principal Box */}
          <View style={styles.sigBox}>
            <Text style={styles.sigBoxTitle}>Principal / Disclosing Party</Text>
            <Text style={styles.sigLine}>Full Name: <Text style={styles.sigValue}>{PRINCIPAL_NAME}</Text></Text>
            <Text style={styles.sigLine}>Title: <Text style={styles.sigValue}>{PRINCIPAL_TITLE}</Text></Text>
            <Text style={styles.sigLine}>Status: <Text style={styles.sigValue}>Authorized & Executed</Text></Text>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>✓ PRINCIPAL SIGNED & SEALED</Text>
            </View>
          </View>

          {/* Assistant Box */}
          <View style={styles.sigBox}>
            <Text style={styles.sigBoxTitle}>Assistant / Receiving Party</Text>
            <Text style={styles.sigLine}>
              Signatory: <Text style={styles.sigValue}>{props.assistantName || "Awaiting Signature"}</Text>
            </Text>
            {props.dateOfBirth && (
              <Text style={styles.sigLine}>
                DOB: <Text style={styles.sigValue}>{props.dateOfBirth}</Text>
              </Text>
            )}
            <Text style={styles.sigLine}>
              Signed At: <Text style={styles.sigValue}>{props.signedAt ? new Date(props.signedAt).toUTCString() : "Pending"}</Text>
            </Text>
            <Text style={styles.sigLine}>
              IP Telemetry: <Text style={styles.sigValue}>{props.ipAddress || "Logged on Consent"}</Text>
            </Text>
            <Text style={styles.sigLine}>
              Device: <Text style={styles.sigValue}>{props.deviceSummary || "Browser Verified"}</Text>
            </Text>
            <View style={isSigned ? styles.stamp : { ...styles.stamp, backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
              <Text style={isSigned ? styles.stampText : { ...styles.stampText, color: "#b45309" }}>
                {isSigned ? "✓ DIGITALLY SIGNED & VERIFIED" : "⏳ PENDING SIGNATURE"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>SHA-256: {props.termsHash.slice(0, 48)}...</Text>
          <Text>Page 2 of 2</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderAgreementPdf(props: AgreementPdfProps) {
  return renderToBuffer(<AgreementPdfDocument {...props} />);
}
