-- This project's default currency is NGN (Naira), not USD. The original migration seeded the
-- `crm_settings` singleton row with the column default at the time ('USD'), so update it now —
-- changing the column default alone (done in crm_core_schema.sql) doesn't touch existing rows.
-- Only touches the settings row if it's still on the original default, so it won't clobber a
-- currency you've already deliberately changed.
update public.crm_settings
set default_currency = 'NGN'
where id = 'default' and default_currency = 'USD';

alter table public.crm_settings alter column default_currency set default 'NGN';
alter table public.crm_invoices alter column currency set default 'NGN';
