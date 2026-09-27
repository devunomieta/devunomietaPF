-- CRM: WhatsApp send/receive log via GREEN-API (see docs/CRM_WHATSAPP_SETUP.md for account setup)
create table if not exists public.crm_whatsapp_events (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.crm_clients(id),
  lead_id uuid references public.crm_leads(id),
  direction text not null, -- 'outbound', 'inbound'
  phone text not null,
  message text,
  status text not null default 'queued', -- queued,sent,delivered,read,failed
  provider_message_id text,
  occurred_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_crm_whatsapp_events_phone on public.crm_whatsapp_events (phone);
create index if not exists idx_crm_whatsapp_events_client on public.crm_whatsapp_events (client_id);
create index if not exists idx_crm_whatsapp_events_lead on public.crm_whatsapp_events (lead_id);

alter table public.crm_whatsapp_events enable row level security;

create policy "Admins can manage crm_whatsapp_events" on public.crm_whatsapp_events for all using (auth.role() = 'authenticated');
