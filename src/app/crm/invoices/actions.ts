"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmail } from "@/lib/brevo";
import { renderInvoicePdf } from "@/lib/crm/invoice-pdf";
import { formatMoney } from "@/lib/crm/currency";
import type { ActionResult, CrmInvoiceLineItem, CrmInvoice, CrmSettings } from "@/lib/crm/types";

async function recomputeInvoiceStatus(supabase: Awaited<ReturnType<typeof requireAdmin>>, invoiceId: string) {
  const { data: invoice } = await supabase.from("crm_invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!invoice) return;

  const { data: payments } = await supabase.from("crm_invoice_payments").select("amount").eq("invoice_id", invoiceId);
  const paid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

  let status = invoice.status;
  if (invoice.total > 0 && paid > invoice.total) {
    status = "overpaid";
  } else if (invoice.total > 0 && paid >= invoice.total) {
    status = "paid";
  } else if (paid > 0) {
    status = "partially_paid";
  } else if (invoice.status !== "draft" && invoice.due_date && new Date(invoice.due_date) < new Date()) {
    status = "overdue";
  } else if (invoice.status === "overdue" || invoice.status === "partially_paid" || invoice.status === "overpaid") {
    status = "sent";
  }

  if (status !== invoice.status) {
    await supabase.from("crm_invoices").update({ status }).eq("id", invoiceId);
  }
}

export async function createInvoice(formData: FormData): Promise<ActionResult & { invoiceId?: string }> {
  const supabase = await requireAdmin();

  const clientId = formData.get("clientId") as string;
  if (!clientId) return { error: "Choose a client." };

  const descriptions = formData.getAll("item_description") as string[];
  const qtys = formData.getAll("item_qty") as string[];
  const prices = formData.getAll("item_unit_price") as string[];

  const lineItems: CrmInvoiceLineItem[] = descriptions
    .map((description, i) => ({
      description: description?.trim() || "",
      qty: parseFloat(qtys[i]) || 0,
      unit_price: parseFloat(prices[i]) || 0,
    }))
    .filter((item) => item.description && item.qty > 0);

  if (lineItems.length === 0) return { error: "Add at least one line item." };

  const currency = (formData.get("currency") as string) || "NGN";
  const taxRate = parseFloat(formData.get("taxRate") as string) || 0;
  const dueDate = (formData.get("dueDate") as string) || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const { data: settings } = await supabase.from("crm_settings").select("invoice_prefix").eq("id", "default").maybeSingle();
  const { data: number, error: numberError } = await supabase.rpc("crm_next_invoice_number", {
    p_prefix: settings?.invoice_prefix || "INV",
  });
  if (numberError) return { error: numberError.message };

  const { data: invoice, error } = await supabase
    .from("crm_invoices")
    .insert([
      {
        client_id: clientId,
        number,
        currency,
        line_items: lineItems,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        due_date: dueDate,
        notes,
        status: "draft",
      },
    ])
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/crm/invoices");
  revalidatePath(`/crm/clients/${clientId}`);
  return { success: true, invoiceId: invoice.id };
}

export async function sendInvoice(invoiceId: string): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { data: invoice } = await supabase.from("crm_invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!invoice) return { error: "Invoice not found." };

  const { data: client } = await supabase.from("crm_clients").select("name, email, company").eq("id", invoice.client_id).maybeSingle();
  if (!client?.email) return { error: "This client has no email address on file." };

  const { data: settings } = await supabase.from("crm_settings").select("*").eq("id", "default").maybeSingle();

  const pdfBuffer = await renderInvoicePdf(invoice as CrmInvoice, client, settings as CrmSettings | null);
  const base64 = pdfBuffer.toString("base64");

  const businessName = settings?.business_name || "us";
  const html = `<p>Hi ${client.name},</p><p>Please find attached invoice <strong>${invoice.number}</strong> for ${formatMoney(Number(invoice.total), invoice.currency)}${invoice.due_date ? `, due ${new Date(invoice.due_date).toLocaleDateString()}` : ""}.</p><p>Thank you,<br/>${businessName}</p>`;

  const result = await sendEmail({
    to: [{ email: client.email, name: client.name }],
    subject: `Invoice ${invoice.number}`,
    htmlContent: html,
    attachments: [{ name: `${invoice.number}.pdf`, content: base64 }],
  });

  if ("error" in result) return { error: result.error };

  await supabase
    .from("crm_invoices")
    .update({ status: invoice.status === "draft" ? "sent" : invoice.status, sent_at: new Date().toISOString() })
    .eq("id", invoiceId);

  revalidatePath(`/crm/invoices/${invoiceId}`);
  return { success: true };
}

export async function recordPayment(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const invoiceId = formData.get("invoiceId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const channel = formData.get("channel") as string;
  const paidAt = (formData.get("paidAt") as string) || new Date().toISOString().slice(0, 10);
  const reference = (formData.get("reference") as string)?.trim() || null;
  const receiptFile = formData.get("receipt") as File | null;

  if (!invoiceId || !amount || amount <= 0) return { error: "Enter a valid amount." };
  if (!channel) return { error: "Choose a payment channel." };

  const { data: currentInvoice } = await supabase.from("crm_invoices").select("total").eq("id", invoiceId).maybeSingle();
  const { data: existingPayments } = await supabase.from("crm_invoice_payments").select("amount").eq("invoice_id", invoiceId);
  const currentPaid = (existingPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const newTotalPaid = currentPaid + amount;
  const invoiceTotal = Number(currentInvoice?.total || 0);

  const overpaymentReason = (formData.get("overpaymentReason") as string)?.trim();
  if (invoiceTotal > 0 && newTotalPaid > invoiceTotal) {
    if (!overpaymentReason && !reference) {
      return { error: "An overpayment reason or reference note is required when recording an overpayment." };
    }
  }

  const finalReference = overpaymentReason
    ? (reference ? `${reference} (Overpay note: ${overpaymentReason})` : `Overpay note: ${overpaymentReason}`)
    : reference;

  let receiptUrl: string | null = null;
  if (receiptFile && receiptFile.size > 0) {
    const adminDb = createAdminClient();
    const path = `${invoiceId}/${Date.now()}-${receiptFile.name}`;
    const { error: uploadError } = await adminDb.storage.from("crm-receipts").upload(path, receiptFile, {
      contentType: receiptFile.type || "application/octet-stream",
    });
    if (uploadError) return { error: `Receipt upload failed: ${uploadError.message}` };
    receiptUrl = path;
  }

  const { error } = await supabase.from("crm_invoice_payments").insert([
    { invoice_id: invoiceId, amount, channel, paid_at: paidAt, reference: finalReference, receipt_url: receiptUrl },
  ]);
  if (error) return { error: error.message };

  await recomputeInvoiceStatus(supabase, invoiceId);

  revalidatePath(`/crm/invoices/${invoiceId}`);
  revalidatePath("/crm/finance");
  return { success: true };
}

export async function getReceiptSignedUrl(path: string): Promise<{ url: string } | { error: string }> {
  await requireAdmin();
  const adminDb = createAdminClient();
  const { data, error } = await adminDb.storage.from("crm-receipts").createSignedUrl(path, 60 * 10);
  if (error || !data) return { error: error?.message || "Could not create a link for this receipt." };
  return { url: data.signedUrl };
}

export async function voidInvoice(invoiceId: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("crm_invoices").update({ status: "void" }).eq("id", invoiceId);
  if (error) return { error: error.message };
  revalidatePath(`/crm/invoices/${invoiceId}`);
  revalidatePath("/crm/invoices");
  return { success: true };
}

/**
 * Super Admin or billing manager updates direct delivery costs and calculates declared net profit & 15% assistant profit share upon service delivery.
 */
export async function updateInvoiceProfitDeclaration(
  invoiceId: string,
  directServiceCost: number,
  coHandledBy?: string | null
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { data: invoice } = await supabase
    .from("crm_invoices")
    .select("total, currency")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return { error: "Invoice not found." };

  const { data: payments } = await supabase
    .from("crm_invoice_payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const cost = Math.max(0, directServiceCost || 0);
  const declaredProfit = Math.max(0, totalPaid - cost);
  const assistantShare = Number((declaredProfit * 0.15).toFixed(2));

  const { error } = await supabase
    .from("crm_invoices")
    .update({
      co_handled_by: coHandledBy || null,
      direct_service_cost: cost,
      declared_profit: declaredProfit,
      assistant_profit_share: assistantShare,
    })
    .eq("id", invoiceId);

  if (error) return { error: error.message };

  revalidatePath(`/crm/invoices/${invoiceId}`);
  revalidatePath("/crm/finance");
  return { success: true };
}
