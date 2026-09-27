-- Fix: the crm_* RLS policies were written as `exists (select 1 from public.admins where
-- email = auth.email())`, copying the pattern from admin_newsletter_schema.sql. But the
-- `admins` table itself is only granted to `service_role` (see cv_seed_and_schema.sql's
-- `GRANT ALL ON public.admins TO service_role;`), so evaluating that subquery as the
-- `authenticated` role fails with "permission denied for table admins" — the RLS policy never
-- even gets to run.
--
-- The rest of this app's admin-write tables (projects, posts, experience, academic — see
-- supabase_schema.sql) don't re-check the admins table in RLS at all: they trust
-- `auth.role() = 'authenticated'`, because the actual admin-membership check already happened
-- server-side (in requireAdmin()/the layout, using the service-role client) before any query
-- reaches Postgres. This migration switches every crm_* policy to that same, already-proven
-- pattern instead of granting broader access to the admins table.

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

drop policy if exists "Admins can manage crm_email_templates" on public.crm_email_templates;
create policy "Admins can manage crm_email_templates" on public.crm_email_templates for all using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage crm_email_campaigns" on public.crm_email_campaigns;
create policy "Admins can manage crm_email_campaigns" on public.crm_email_campaigns for all using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage crm_email_events" on public.crm_email_events;
create policy "Admins can manage crm_email_events" on public.crm_email_events for all using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage crm_suppressions" on public.crm_suppressions;
create policy "Admins can manage crm_suppressions" on public.crm_suppressions for all using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage crm_invoices" on public.crm_invoices;
create policy "Admins can manage crm_invoices" on public.crm_invoices for all using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage crm_invoice_payments" on public.crm_invoice_payments;
create policy "Admins can manage crm_invoice_payments" on public.crm_invoice_payments for all using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage crm_whatsapp_events" on public.crm_whatsapp_events;
create policy "Admins can manage crm_whatsapp_events" on public.crm_whatsapp_events for all using (auth.role() = 'authenticated');
