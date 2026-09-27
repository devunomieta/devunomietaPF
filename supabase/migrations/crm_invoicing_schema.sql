-- CRM: Invoice numbering — a Postgres sequence gives every invoice a unique, gap-tracked,
-- concurrency-safe number regardless of how many are created back to back.
create sequence if not exists crm_invoice_seq;

create or replace function public.crm_next_invoice_number(p_prefix text default 'INV')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  n := nextval('crm_invoice_seq');
  return p_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
end;
$$;

grant execute on function public.crm_next_invoice_number(text) to authenticated;

create table if not exists public.crm_invoices (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.crm_clients(id) on delete restrict,
  number text unique not null,
  status text not null default 'draft', -- draft,sent,viewed,partially_paid,paid,overdue,void
  currency text not null default 'USD',
  line_items jsonb not null default '[]'::jsonb, -- [{description, qty, unit_price}]
  subtotal numeric not null default 0,
  tax_rate numeric not null default 0,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  due_date date,
  notes text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.crm_invoice_payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.crm_invoices(id) on delete cascade,
  amount numeric not null,
  channel text not null, -- bank_transfer,cash,mobile_money,card,other
  paid_at date not null default current_date,
  reference text,
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_crm_invoices_client on public.crm_invoices (client_id);
create index if not exists idx_crm_invoices_status on public.crm_invoices (status, due_date);
create index if not exists idx_crm_invoice_payments_invoice on public.crm_invoice_payments (invoice_id);

alter table public.crm_invoices enable row level security;
alter table public.crm_invoice_payments enable row level security;

create policy "Admins can manage crm_invoices" on public.crm_invoices for all using (
  exists (select 1 from public.admins where email = auth.email())
);
create policy "Admins can manage crm_invoice_payments" on public.crm_invoice_payments for all using (
  exists (select 1 from public.admins where email = auth.email())
);

-- Storage buckets: receipts stay private (served via signed URL), logo is public (read in the PDF/UI)
insert into storage.buckets (id, name, public) values ('crm-receipts', 'crm-receipts', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('crm-logos', 'crm-logos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('crm-imports', 'crm-imports', false)
  on conflict (id) do nothing;
