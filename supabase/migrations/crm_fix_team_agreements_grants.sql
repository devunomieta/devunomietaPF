-- Fix: Grant all privileges on crm_team_agreements to service_role and authenticated
-- This resolves the "permission denied for table crm_team_agreements" error during inviteCrmUser and agreement signing.

grant usage on schema public to service_role;
grant usage on schema public to authenticated;

grant all on table public.crm_team_agreements to service_role;
grant select, insert, update, delete on table public.crm_team_agreements to authenticated;

-- Ensure RLS is active and allows authenticated access to their own agreements and admins to all
alter table public.crm_team_agreements enable row level security;

drop policy if exists "Authenticated users and admins can access agreements" on public.crm_team_agreements;
create policy "Authenticated users and admins can access agreements" 
  on public.crm_team_agreements 
  for all 
  using (auth.role() = 'authenticated');
