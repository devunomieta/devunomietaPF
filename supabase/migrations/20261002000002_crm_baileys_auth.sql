-- Migration: Provision crm_baileys_auth and grant full permissions to service_role and authenticated
--
-- Why: Baileys WhatsApp Bridge runs as a standalone service using Supabase service_role / secret key.
-- It requires persisting authentication credentials and signal crypto keys to `crm_baileys_auth`.
-- Without explicit GRANT to service_role, Supabase rejects reads/writes with error 42501 (permission denied),
-- causing WhatsApp QR pairing and phone handshakes to fail immediately upon scanning.

create table if not exists public.crm_baileys_auth (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_crm_baileys_auth_updated_at on public.crm_baileys_auth (updated_at);

alter table public.crm_baileys_auth enable row level security;

grant usage on schema public to service_role;
grant usage on schema public to authenticated;

grant all on public.crm_baileys_auth to service_role;
grant select, insert, update, delete on public.crm_baileys_auth to authenticated;

-- Policies for RLS
drop policy if exists "Service role has full access on crm_baileys_auth" on public.crm_baileys_auth;
create policy "Service role has full access on crm_baileys_auth"
  on public.crm_baileys_auth
  for all
  using (true)
  with check (true);

drop policy if exists "Authenticated users can read/manage crm_baileys_auth" on public.crm_baileys_auth;
create policy "Authenticated users can read/manage crm_baileys_auth"
  on public.crm_baileys_auth
  for all
  using (auth.role() = 'authenticated');
