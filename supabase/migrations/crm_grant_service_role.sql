-- Fix: Grant all CRM tables to service_role and authenticated.
-- The Brevo webhook and background sync processes execute server-side using the Supabase
-- service_role key (createAdminClient). Without explicit grants on these tables to service_role,
-- Postgres rejects the query with "permission denied for table crm_email_events"
-- and events (delivered, opened, clicked, bounced) fail to save into the database.

grant usage on schema public to service_role;
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
      execute format('grant all on public.%I to service_role', tbl);
      execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
      raise notice 'Granted service_role and authenticated on %', tbl;
    exception when others then
      raise notice 'Could not grant on % (%): %', tbl, sqlstate, sqlerrm;
    end;
  end loop;
end $$;
