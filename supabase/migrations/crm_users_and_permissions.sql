-- CRM Team Users, Granular Modular Permissions & Audit Logs

-- 1. Table: crm_users (Team accounts for assistants & operators)
create table if not exists public.crm_users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  role_title text default 'Personal Assistant',
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Table: crm_user_permissions (Granular page-level & sensitive action-level RBAC)
create table if not exists public.crm_user_permissions (
  user_id uuid primary key references public.crm_users(id) on delete cascade,
  permissions jsonb not null default '{
    "pages": {
      "dashboard": true,
      "clients": true,
      "leads": true,
      "journeys": true,
      "campaigns": true,
      "whatsapp": true,
      "invoices": false,
      "finance": false,
      "import": false,
      "monitoring": false,
      "settings": false,
      "users": false
    },
    "actions": {
      "clients_edit": true,
      "clients_delete": false,
      "leads_edit": true,
      "leads_delete": false,
      "invoices_create": false,
      "invoices_delete": false,
      "campaigns_send": true,
      "whatsapp_send": true
    }
  }'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Table: crm_audit_logs (Track every action made by team members/assistants)
create table if not exists public.crm_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_email text not null,
  actor_name text not null,
  action text not null, -- 'create','update','delete','convert','send'
  entity_type text not null, -- 'client','lead','invoice','campaign','whatsapp','user'
  entity_id text,
  summary text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_crm_audit_created on public.crm_audit_logs (created_at desc);
create index if not exists idx_crm_users_email on public.crm_users (email);

-- 4. Enable RLS
alter table public.crm_users enable row level security;
alter table public.crm_user_permissions enable row level security;
alter table public.crm_audit_logs enable row level security;

-- 5. Policies & Grants
grant select, insert, update, delete on public.crm_users to authenticated, service_role;
grant select, insert, update, delete on public.crm_user_permissions to authenticated, service_role;
grant select, insert, update, delete on public.crm_audit_logs to authenticated, service_role;

drop policy if exists "Admins and CRM users can view users" on public.crm_users;
create policy "Admins and CRM users can view users" on public.crm_users for all using (auth.role() = 'authenticated');

drop policy if exists "Admins and CRM users can view permissions" on public.crm_user_permissions;
create policy "Admins and CRM users can view permissions" on public.crm_user_permissions for all using (auth.role() = 'authenticated');

drop policy if exists "Admins and CRM users can access audit logs" on public.crm_audit_logs;
create policy "Admins and CRM users can access audit logs" on public.crm_audit_logs for all using (auth.role() = 'authenticated');
