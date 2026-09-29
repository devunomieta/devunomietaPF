-- Migration: CRM Reports Settings
-- Adds automated monthly reports dispatch configuration, target recipient emails, and default credit terms (for overdue/aging calculations).

alter table public.crm_settings
  add column if not exists report_notification_emails text[] not null default '{}',
  add column if not exists report_auto_send boolean not null default true,
  add column if not exists report_send_day_of_month integer not null default 1,
  add column if not exists report_default_due_days integer not null default 14;

-- Comment for documentation
comment on column public.crm_settings.report_notification_emails is 'Email addresses that receive automated monthly executive reports';
comment on column public.crm_settings.report_auto_send is 'Whether monthly reports are automatically dispatched on the 1st of each month';
comment on column public.crm_settings.report_default_due_days is 'Default net payment terms (in days) applied when an invoice has no explicit due date';
