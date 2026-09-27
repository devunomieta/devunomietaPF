-- CRM: Clients
create table if not exists public.crm_clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'active', -- 'active', 'archived'
  tags text[] not null default '{}',
  source text, -- 'import', 'manual', 'lead_conversion'
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- CRM: Journeys (pipelines) — stages held as an ordered jsonb array:
-- [{ "key": "lead", "label": "Lead", "position": 0, "is_won": false, "is_lost": false }, ...]
create table if not exists public.crm_journeys (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  stages jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- CRM: Leads
create table if not exists public.crm_leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  company text,
  source text, -- 'import', 'manual', 'website'
  score integer not null default 0,
  status text not null default 'open', -- 'open', 'won', 'lost'
  journey_id uuid references public.crm_journeys(id),
  current_stage_key text not null default 'lead',
  converted_to_client_id uuid references public.crm_clients(id),
  tags text[] not null default '{}',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- CRM: Contacts — a person at a client or a lead (exactly one owner)
create table if not exists public.crm_contacts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.crm_clients(id) on delete cascade,
  lead_id uuid references public.crm_leads(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint crm_contacts_one_owner check (
    (case when client_id is not null then 1 else 0 end +
     case when lead_id is not null then 1 else 0 end) = 1
  )
);

-- CRM: Stage history — every move through a journey (exactly one subject)
create table if not exists public.crm_stage_events (
  id uuid primary key default uuid_generate_v4(),
  journey_id uuid references public.crm_journeys(id),
  client_id uuid references public.crm_clients(id) on delete cascade,
  lead_id uuid references public.crm_leads(id) on delete cascade,
  stage_key text not null,
  note text,
  entered_at timestamp with time zone default timezone('utc'::text, now()),
  constraint crm_stage_events_one_subject check (
    (case when client_id is not null then 1 else 0 end +
     case when lead_id is not null then 1 else 0 end) = 1
  )
);

-- CRM: Background jobs — drained by /api/cron/crm-jobs and a manual "process now" action
create table if not exists public.crm_jobs (
  id uuid primary key default uuid_generate_v4(),
  type text not null, -- 'import', 'bulk_send', 'bulk_whatsapp'
  status text not null default 'queued', -- 'queued', 'processing', 'done', 'failed', 'canceled'
  payload jsonb not null default '{}'::jsonb,
  progress integer not null default 0,
  total integer not null default 0,
  error text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- CRM: Settings — single row, invoice branding + operational knobs
create table if not exists public.crm_settings (
  id text primary key default 'default',
  business_name text,
  business_email text,
  business_phone text,
  business_address text,
  logo_url text,
  brand_color text not null default '#58a6ff',
  invoice_prefix text not null default 'INV',
  invoice_footer_note text,
  default_currency text not null default 'USD',
  default_tax_rate numeric not null default 0,
  brevo_daily_cap integer not null default 300,
  whatsapp_enabled boolean not null default false,
  bounce_alert_threshold numeric not null default 5,
  complaint_alert_threshold numeric not null default 0.1,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
insert into public.crm_settings (id) values ('default') on conflict (id) do nothing;

-- Default journey seed (matches the 5-stage pipeline in the implementation plan)
insert into public.crm_journeys (name, stages, is_default)
select 'Default pipeline',
  '[
    {"key":"lead","label":"Lead","position":0,"is_won":false,"is_lost":false},
    {"key":"contacted","label":"Contacted","position":1,"is_won":false,"is_lost":false},
    {"key":"qualified","label":"Qualified","position":2,"is_won":false,"is_lost":false},
    {"key":"proposal","label":"Proposal","position":3,"is_won":false,"is_lost":false},
    {"key":"won","label":"Client (won)","position":4,"is_won":true,"is_lost":false},
    {"key":"lost","label":"Lost","position":5,"is_won":false,"is_lost":true}
  ]'::jsonb,
  true
where not exists (select 1 from public.crm_journeys where is_default = true);

-- Indexes
create index if not exists idx_crm_clients_email on public.crm_clients (email);
create index if not exists idx_crm_leads_email on public.crm_leads (email);
create index if not exists idx_crm_leads_status on public.crm_leads (status);
create index if not exists idx_crm_leads_stage on public.crm_leads (current_stage_key);
create index if not exists idx_crm_contacts_client on public.crm_contacts (client_id);
create index if not exists idx_crm_contacts_lead on public.crm_contacts (lead_id);
create index if not exists idx_crm_stage_events_client on public.crm_stage_events (client_id);
create index if not exists idx_crm_stage_events_lead on public.crm_stage_events (lead_id);
create index if not exists idx_crm_jobs_status on public.crm_jobs (status, type);

-- RLS — admin-only, mirroring the exists(admins) pattern used by subscribers/campaigns
alter table public.crm_clients enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_journeys enable row level security;
alter table public.crm_stage_events enable row level security;
alter table public.crm_jobs enable row level security;
alter table public.crm_settings enable row level security;

-- Explicit grants: this project's default privileges don't reliably extend to
-- tables created outside the original provisioning session (see crm_fix_grants.sql).
grant select, insert, update, delete on public.crm_clients to authenticated;
grant select, insert, update, delete on public.crm_leads to authenticated;
grant select, insert, update, delete on public.crm_contacts to authenticated;
grant select, insert, update, delete on public.crm_journeys to authenticated;
grant select, insert, update, delete on public.crm_stage_events to authenticated;
grant select, insert, update, delete on public.crm_jobs to authenticated;
grant select, insert, update, delete on public.crm_settings to authenticated;

drop policy if exists "Admins can manage crm_clients" on public.crm_clients;
create policy "Admins can manage crm_clients" on public.crm_clients for all using (auth.role() = 'authenticated');
drop policy if exists "Admins can manage crm_leads" on public.crm_leads;
create policy "Admins can manage crm_leads" on public.crm_leads for all using (auth.role() = 'authenticated');
drop policy if exists "Admins can manage crm_contacts" on public.crm_contacts;
create policy "Admins can manage crm_contacts" on public.crm_contacts for all using (auth.role() = 'authenticated');
drop policy if exists "Admins can manage crm_journeys" on public.crm_journeys;
create policy "Admins can manage crm_journeys" on public.crm_journeys for all using (auth.role() = 'authenticated');
drop policy if exists "Admins can manage crm_stage_events" on public.crm_stage_events;
create policy "Admins can manage crm_stage_events" on public.crm_stage_events for all using (auth.role() = 'authenticated');
drop policy if exists "Admins can manage crm_jobs" on public.crm_jobs;
create policy "Admins can manage crm_jobs" on public.crm_jobs for all using (auth.role() = 'authenticated');
drop policy if exists "Admins can manage crm_settings" on public.crm_settings;
create policy "Admins can manage crm_settings" on public.crm_settings for all using (auth.role() = 'authenticated');
