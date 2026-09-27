-- CRM: Reusable email templates (merge tags like {{first_name}} are resolved at send time)
create table if not exists public.crm_email_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subject text not null,
  html text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- CRM: Bulk/single campaigns. A single send (from a client/lead record) also gets a row here
-- so it shares the same crm_email_events trail as bulk campaigns.
create table if not exists public.crm_email_campaigns (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.crm_email_templates(id),
  subject text not null,
  html text not null,
  audience jsonb not null default '{}'::jsonb, -- {"segment":"clients"|"leads","tags":[],"stage_key":null}
  kind text not null default 'bulk', -- 'single', 'bulk'
  status text not null default 'draft', -- 'draft','queued','sending','sent','failed'
  scheduled_at timestamp with time zone,
  sent_count integer not null default 0,
  total_recipients integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- CRM: Every mail event, sourced from the Brevo webhook (delivery/bounce/complaint/open/click)
create table if not exists public.crm_email_events (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references public.crm_email_campaigns(id) on delete cascade,
  client_id uuid references public.crm_clients(id),
  lead_id uuid references public.crm_leads(id),
  recipient_email text not null,
  type text not null, -- 'sent','delivered','opened','clicked','soft_bounce','hard_bounce','complaint','unsubscribed','error'
  message_id text,
  occurred_at timestamp with time zone default timezone('utc'::text, now()),
  meta jsonb not null default '{}'::jsonb
);

-- CRM: Suppression list — hard bounces/complaints/unsubscribes are never sent to again
create table if not exists public.crm_suppressions (
  email text primary key,
  reason text not null, -- 'hard_bounce','complaint','unsubscribed','manual'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_crm_email_events_campaign on public.crm_email_events (campaign_id);
create index if not exists idx_crm_email_events_type on public.crm_email_events (type, occurred_at);
create index if not exists idx_crm_email_events_recipient on public.crm_email_events (recipient_email);

alter table public.crm_email_templates enable row level security;
alter table public.crm_email_campaigns enable row level security;
alter table public.crm_email_events enable row level security;
alter table public.crm_suppressions enable row level security;

drop policy if exists "Admins can manage crm_email_templates" on public.crm_email_templates;
create policy "Admins can manage crm_email_templates" on public.crm_email_templates for all using (auth.role() = 'authenticated');
drop policy if exists "Admins can manage crm_email_campaigns" on public.crm_email_campaigns;
create policy "Admins can manage crm_email_campaigns" on public.crm_email_campaigns for all using (auth.role() = 'authenticated');
drop policy if exists "Admins can manage crm_email_events" on public.crm_email_events;
create policy "Admins can manage crm_email_events" on public.crm_email_events for all using (auth.role() = 'authenticated');
drop policy if exists "Admins can manage crm_suppressions" on public.crm_suppressions;
create policy "Admins can manage crm_suppressions" on public.crm_suppressions for all using (auth.role() = 'authenticated');
