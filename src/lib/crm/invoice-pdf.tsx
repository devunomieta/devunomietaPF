import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { CrmInvoice, CrmSettings } from "@/lib/crm/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 90, height: 90, objectFit: "contain", marginBottom: 8 },
  businessName: { fontSize: 14, fontWeight: 700 },
  muted: { color: "#6b7280" },
  invoiceTitle: { fontSize: 22, fontWeight: 700, textAlign: "right" },
  invoiceMeta: { textAlign: "right", marginTop: 4 },
  section: { marginBottom: 20 },
  billTo: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  table: { marginTop: 10, borderTopWidth: 1, borderColor: "#e5e7eb" },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e5e7eb", paddingVertical: 6, fontWeight: 700 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#f3f4f6", paddingVertical: 6 },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  totalsBlock: { marginTop: 16, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 3 },
  totalsRowFinal: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 1, borderColor: "#111827", marginTop: 4 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, textAlign: "center", color: "#6b7280", fontSize: 9 },
});

function money(n: number, currency: string) {
  return `${currency} ${n.toFixed(2)}`;
}

export async function renderInvoicePdf(
  invoice: CrmInvoice,
  client: { name: string; email: string | null; company: string | null },
  settings: CrmSettings | null
): Promise<Buffer> {
  const brandColor = settings?.brand_color || "#58a6ff";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {settings?.logo_url && <Image src={settings.logo_url} style={styles.logo} />}
            <Text style={[styles.businessName, { color: brandColor }]}>{settings?.business_name || "Your business"}</Text>
            {settings?.business_email && <Text style={styles.muted}>{settings.business_email}</Text>}
            {settings?.business_phone && <Text style={styles.muted}>{settings.business_phone}</Text>}
            {settings?.business_address && <Text style={styles.muted}>{settings.business_address}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>{invoice.number}</Text>
            <Text style={[styles.invoiceMeta, styles.muted]}>Issued {new Date(invoice.created_at).toLocaleDateString()}</Text>
            {invoice.due_date && <Text style={[styles.invoiceMeta, styles.muted]}>Due {new Date(invoice.due_date).toLocaleDateString()}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.billTo}>Bill to</Text>
          <Text>{client.name}</Text>
          {client.company && <Text style={styles.muted}>{client.company}</Text>}
          {client.email && <Text style={styles.muted}>{client.email}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit price</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {invoice.line_items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={styles.colPrice}>{money(item.unit_price, invoice.currency)}</Text>
              <Text style={styles.colTotal}>{money(item.qty * item.unit_price, invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{money(invoice.subtotal, invoice.currency)}</Text>
          </View>
          {invoice.tax_rate > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.muted}>Tax ({invoice.tax_rate}%)</Text>
              <Text>{money(invoice.tax_amount, invoice.currency)}</Text>
            </View>
          )}
          <View style={styles.totalsRowFinal}>
            <Text style={{ fontWeight: 700 }}>Total</Text>
            <Text style={{ fontWeight: 700 }}>{money(invoice.total, invoice.currency)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.muted}>{invoice.notes}</Text>
          </View>
        )}

        {settings?.invoice_footer_note && <Text style={styles.footer}>{settings.invoice_footer_note}</Text>}
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
