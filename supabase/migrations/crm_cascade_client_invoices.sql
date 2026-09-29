-- Update crm_invoices foreign key to CASCADE on client deletion
alter table public.crm_invoices 
  drop constraint if exists crm_invoices_client_id_fkey,
  add constraint crm_invoices_client_id_fkey 
  foreign key (client_id) references public.crm_clients(id) on delete cascade;
