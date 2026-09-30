import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, Mail, MessageCircle, Receipt } from "lucide-react";
import type { CrmClient, CrmContact, CrmStageEvent, CrmInvoice, CrmThread, CrmInternalNote, CrmCommunicationTemplate } from "@/lib/crm/types";
import { ClientDetailClient } from "./ClientDetailClient";
import { getEntityCommunicationFeed, getCommunicationTemplates } from "@/app/crm/mailbox/actions";

export const metadata = { title: "Client · CRM" };

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: client },
    { data: contacts },
    { data: stageEvents },
    { data: invoices },
    { data: whatsappEvents },
    feed,
    templates,
  ] = await Promise.all([
    supabase.from("crm_clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("crm_contacts").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("crm_stage_events").select("*").eq("client_id", id).order("entered_at", { ascending: false }),
    supabase.from("crm_invoices").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("crm_whatsapp_events").select("id, phone, message, status, direction, created_at").eq("client_id", id).order("created_at", { ascending: false }),
    getEntityCommunicationFeed({ clientId: id }),
    getCommunicationTemplates(),
  ]);

  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/crm/clients" className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} />
        Clients
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
          <p className="text-sm text-muted">{client.company || "No company"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/crm/campaigns/new?clientId=${client.id}`}
            className="px-3 py-2 border border-border rounded-lg hover:bg-header/50 transition-all text-sm inline-flex items-center gap-1.5"
          >
            <Mail size={14} /> Email
          </Link>
          <Link
            href={`/crm/whatsapp?clientId=${client.id}`}
            className="px-3 py-2 border border-border rounded-lg hover:bg-header/50 transition-all text-sm inline-flex items-center gap-1.5"
          >
            <MessageCircle size={14} /> WhatsApp
          </Link>
          <Link
            href={`/crm/invoices/new?clientId=${client.id}`}
            className="px-3 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 transition-all text-sm inline-flex items-center gap-1.5"
          >
            <Receipt size={14} /> New invoice
          </Link>
        </div>
      </div>

      <ClientDetailClient
        client={client as CrmClient}
        contacts={(contacts as CrmContact[]) || []}
        stageEvents={(stageEvents as CrmStageEvent[]) || []}
        invoices={(invoices as CrmInvoice[]) || []}
        threads={(feed?.threads as CrmThread[]) || []}
        internalNotes={(feed?.internalNotes as CrmInternalNote[]) || []}
        templates={(templates as CrmCommunicationTemplate[]) || []}
        whatsAppEvents={(whatsappEvents as any[]) || []}
      />
    </div>
  );
}
