-- Fix: "permission denied for table crm_whatsapp_events" (and crm_settings, and potentially
-- any other crm_* table). This is a different failure mode from the earlier RLS fix —
-- "permission denied for table X" means the `authenticated` role lacks the base Postgres GRANT
-- on that table entirely, so the query is rejected before RLS policies are even evaluated.
--
-- Every other table in this project (projects, posts, subscribers, etc.) works for
-- `authenticated` without an explicit GRANT here, which means this project's default
-- privileges (`ALTER DEFAULT PRIVILEGES ... GRANT ... TO authenticated`) are scoped to
-- whichever role originally provisioned those tables. The crm_* tables were created through a
-- different session and didn't inherit that default, so grant them explicitly instead.
--
-- Written as a per-table loop with its own exception handler so that if any single table is
-- missing or already in a odd state, it's skipped (and reported via `raise notice`) rather than
-- aborting the whole script and silently leaving every later table ungranted — which is what
-- happened with the plain multi-statement version of this fix.

grant usage on schema public to authenticated;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'crm_clients', 'crm_leads', 'crm_contacts', 'crm_journeys', 'crm_stage_events',
    'crm_jobs', 'crm_settings',
    'crm_email_templates', 'crm_email_campaigns', 'crm_email_events', 'crm_suppressions',
    'crm_invoices', 'crm_invoice_payments',
    'crm_whatsapp_events'
  ]
  loop
    begin
      execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
      raise notice 'Granted authenticated on %', tbl;
    exception when others then
      raise notice 'Could not grant on % (%): %', tbl, sqlstate, sqlerrm;
    end;
  end loop;
end $$;
